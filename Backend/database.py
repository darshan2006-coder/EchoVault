import sqlite3
import re

DATABASE_NAME = "memories.db"


def get_connection():
    return sqlite3.connect(DATABASE_NAME)


def create_table():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person TEXT NOT NULL,
            title TEXT NOT NULL,
            story TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.commit()
    connection.close()


def save_memory(person, title, story):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO memories (person, title, story)
        VALUES (?, ?, ?)
    """, (person, title, story))

    connection.commit()
    memory_id = cursor.lastrowid
    connection.close()

    return memory_id


def get_all_memories():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT * FROM memories
        ORDER BY created_at DESC
    """)

    memories = cursor.fetchall()
    connection.close()

    return memories


def delete_memory(memory_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM memories WHERE id = ?",
        (memory_id,)
    )

    connection.commit()
    deleted = cursor.rowcount > 0
    connection.close()

    return deleted


# MEMORY SEARCH

STOP_WORDS = {
    "what", "when", "where", "who", "why", "how",
    "did", "does", "do", "the", "a", "an", "is",
    "was", "were", "my", "me", "tell", "about",
    "can", "you", "of", "in", "to", "and",
    "have", "has", "had", "i", "saved", "show",
    "list", "all", "every", "please", "your",
    "remember", "memories", "memory", "enjoy",
    "enjoyed", "doing", "person", "people",
    "grandfather", "grandmother", "grandpa",
    "grandma", "father", "mother", "family",
    "favorite", "favourite"
}


# Normalize a few common word variations.
WORD_NORMALIZATION = {
    "taught": "teach",
    "teaches": "teach",
    "teaching": "teach",
    "gardening": "garden",
    "gardens": "garden",
    "watered": "water",
    "watering": "water",
    "plants": "plant",
    "movies": "movie",
    "sweets": "sweet",
    "recipes": "recipe"
}


def normalize_words(text):
    words = re.findall(r"\b[a-z0-9]+\b", text.lower())

    normalized = []

    for word in words:
        word = WORD_NORMALIZATION.get(word, word)

        if word not in STOP_WORDS and len(word) > 2:
            normalized.append(word)

    return set(normalized)


def is_memory_overview_question(query):

    normalized_query = query.lower()

    overview_phrases = [
        "what memories have i saved",
        "what are my saved memories",
        "show all my memories",
        "list all my memories",
        "show my memories",
        "list my memories",
        "what do you remember about me",
        "what have i saved",
        "show everything i saved"
    ]

    return any(
        phrase in normalized_query
        for phrase in overview_phrases
    )


def search_memories(query):

    connection = get_connection()
    cursor = connection.cursor()

    # MEMORY OVERVIEW
    if is_memory_overview_question(query):

        cursor.execute("""
            SELECT id, person, title, story, created_at
            FROM memories
            ORDER BY created_at DESC
            LIMIT 20
        """)

        memories = cursor.fetchall()
        connection.close()

        return memories

    # EXTRACT QUERY KEYWORDS
    query_keywords = normalize_words(query)

    if not query_keywords:
        connection.close()
        return []

    # GET ALL SAVED MEMORIES
    cursor.execute("""
        SELECT id, person, title, story, created_at
        FROM memories
    """)

    all_memories = cursor.fetchall()
    connection.close()

    ranked_memories = []

    # RANK MEMORIES USING THEIR ACTUAL CONTENT
    for memory in all_memories:

        memory_id, person, title, story, created_at = memory

        title_keywords = normalize_words(title)
        story_keywords = normalize_words(story)

        score = 0

        # Title matches receive higher importance.
        title_matches = query_keywords.intersection(
            title_keywords
        )

        score += len(title_matches) * 3

        # Story matches receive additional importance.
        story_matches = query_keywords.intersection(
            story_keywords
        )

        score += len(story_matches)

        # Do not use the person's name as evidence.
        if score > 0:
            ranked_memories.append((score, memory))

    # SORT BY RELEVANCE
    ranked_memories.sort(
        key=lambda item: item[0],
        reverse=True
    )

    # RETURN ONLY THE TOP THREE MATCHES
    return [
        memory
        for score, memory in ranked_memories[:3]
    ]
