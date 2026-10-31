import json
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import (
    create_table,
    save_memory,
    get_all_memories,
    delete_memory,
    search_memories,
    is_memory_overview_question
)


app = FastAPI(title="EchoVault")


# FRONTEND CONNECTION

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# DATABASE INITIALIZATION

@app.on_event("startup")
def startup():
    create_table()


# LOCAL AI CONFIGURATION

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:1.5b"


# REQUEST MODELS

class ChatRequest(BaseModel):
    message: str


class MemoryRequest(BaseModel):
    person: str
    title: str
    story: str


# HOME ENDPOINT

@app.get("/")
def home():
    return {
        "message": "Welcome to EchoVault!",
        "status": "running"
    }


# GHOST CHAT ENDPOINT

@app.post("/chat")
def chat(request: ChatRequest):

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Please enter a message."
        )

    # STEP 1: HANDLE MEMORY OVERVIEW QUESTIONS
    # Do not depend on the AI to list every saved memory.

    if is_memory_overview_question(message):

        all_memories = get_all_memories()

        if not all_memories:
            return {
                "reply": "You haven't saved any memories yet.",
                "retrieved_memories": []
            }

        memory_summary = "\n".join(
            [
                f"{index}. {memory[1]}: {memory[2]} - {memory[3]}"
                for index, memory in enumerate(
                    all_memories, start=1
                )
            ]
        )

        return {
            "reply": (
                f"You have saved {len(all_memories)} memories:\n\n"
                f"{memory_summary}"
            ),
            "retrieved_memories": [
                {
                    "id": memory[0],
                    "person": memory[1],
                    "title": memory[2]
                }
                for memory in all_memories
            ]
        }

    # STEP 2: SEARCH FOR RELEVANT MEMORIES

    memories = search_memories(message)

    # STEP 3: NEVER ASK AI TO ANSWER WITHOUT EVIDENCE

    if not memories:
        return {
            "reply": (
                "I don't have that specific information "
                "in your saved memories."
            ),
            "retrieved_memories": []
        }

    # STEP 4: PREPARE MEMORY CONTEXT

    memory_context = "\n\n".join(
        [
            f"Memory ID: {memory[0]}\n"
            f"Person: {memory[1]}\n"
            f"Title: {memory[2]}\n"
            f"Story: {memory[3]}"
            for memory in memories
        ]
    )

    # STEP 5: ASK LOCAL AI

    prompt = f"""
You are EchoVault, a personal memory preservation assistant.

Answer the user's question using ONLY the saved memories below.

STRICT RULES:

1. Never invent personal facts or events.
2. Never use general knowledge to fill missing personal information.
3. Only state facts explicitly supported by the saved memories.
4. If the requested information is missing, say:
   "I don't have that specific information in your saved memories."
5. Do not confuse different people or different memories.
6. Include only IDs of memories that directly support your answer.
7. Be warm, respectful and concise.

SAVED MEMORIES:

{memory_context}

USER QUESTION:

{message}

Return ONLY valid JSON:

{{
    "reply": "Your answer",
    "used_memory_ids": []
}}
"""

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=180
        )

        response.raise_for_status()

        result = response.json()

        ai_result = json.loads(result["response"])

        reply = ai_result.get("reply", "")
        used_memory_ids = ai_result.get(
            "used_memory_ids", []
        )

        if not isinstance(reply, str) or not reply.strip():
            raise ValueError("Invalid AI reply.")

        if not isinstance(used_memory_ids, list):
            used_memory_ids = []

        # STEP 6: VALIDATE MEMORY REFERENCES

        available_memories = {
            memory[0]: memory
            for memory in memories
        }

        valid_ids = []

        for memory_id in used_memory_ids:

            if (
                isinstance(memory_id, int)
                and not isinstance(memory_id, bool)
                and memory_id in available_memories
                and memory_id not in valid_ids
            ):
                valid_ids.append(memory_id)

        referenced_memories = [
            {
                "id": memory_id,
                "person": available_memories[memory_id][1],
                "title": available_memories[memory_id][2]
            }
            for memory_id in valid_ids
        ]

        return {
            "reply": reply.strip(),
            "retrieved_memories": referenced_memories
        }

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Local AI service is unavailable."
        )

    except (
        ValueError,
        KeyError,
        TypeError,
        json.JSONDecodeError
    ):
        raise HTTPException(
            status_code=502,
            detail="EchoVault received an invalid response from the local AI."
        )


# MEMORY MANAGEMENT ENDPOINTS


@app.post("/memories")
def create_memory(memory: MemoryRequest):

    if not all([
        memory.person.strip(),
        memory.title.strip(),
        memory.story.strip()
    ]):
        raise HTTPException(
            status_code=400,
            detail="All memory fields are required."
        )

    memory_id = save_memory(
        memory.person.strip(),
        memory.title.strip(),
        memory.story.strip()
    )

    return {
        "message": "Memory saved successfully!",
        "memory_id": memory_id
    }


@app.get("/memories")
def list_memories():

    memories = get_all_memories()

    return {
        "memories": [
            {
                "id": row[0],
                "person": row[1],
                "title": row[2],
                "story": row[3],
                "created_at": row[4]
            }
            for row in memories
        ]
    }


@app.delete("/memories/{memory_id}")
def remove_memory(memory_id: int):

    deleted = delete_memory(memory_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Memory not found."
        )

    return {
        "message": "Memory deleted successfully!"
    }
