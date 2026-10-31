
import { useEffect, useState } from "react";
import {
  Ghost,
  LayoutDashboard,
  BookHeart,
  MessageCircle,
  Plus,
  Search,
  Moon,
  Sparkles,
  Heart,
  Clock,
  ChevronRight,
  Menu,
  X,
  Trash2
} from "lucide-react";

import "./App.css";

const API_URL = "http://localhost:8000";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Memory data from SQLite
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Memory form states
  const [showMemoryForm, setShowMemoryForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Memory state
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    person: "",
    title: "",
    story: ""
  });

  // Ghost Chat states
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  // Fetch memories from FastAPI
  async function fetchMemories() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/memories`);

      if (!response.ok) {
        throw new Error("Unable to fetch memories.");
      }

      const data = await response.json();

      setMemories(data.memories);

      return true;

    } catch (err) {
      setError(
        "Could not connect to EchoVault. Please check whether the backend is running."
      );

      return false;

    } finally {
      setIsLoading(false);
    }
  }

  // Fetch memories when application loads
  useEffect(() => {
    fetchMemories();
  }, []);

  // Navigation
  const navigation = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Memory Vault", icon: BookHeart },
    { name: "Ghost Chat", icon: MessageCircle }
  ];

  // Search actual database memories
  const filteredMemories = memories.filter(memory =>
    `${memory.person} ${memory.title} ${memory.story}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Dashboard statistics
  const totalMemories = memories.length;

  const totalPeople = new Set(
    memories.map(memory => memory.person.toLowerCase())
  ).size;

  // Add Memory API integration
  async function handleSaveMemory(event) {
    event.preventDefault();

    setFormError("");

    if (
      !formData.person.trim() ||
      !formData.title.trim() ||
      !formData.story.trim()
    ) {
      setFormError("Please complete all three fields.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(`${API_URL}/memories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          person: formData.person.trim(),
          title: formData.title.trim(),
          story: formData.story.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not save memory."
        );
      }

      // Refresh records from SQLite
      await fetchMemories();

      // Reset form
      setFormData({
        person: "",
        title: "",
        story: ""
      });

      setShowMemoryForm(false);
      setActivePage("Memory Vault");

    } catch (err) {
      setFormError(err.message);

    } finally {
      setIsSaving(false);
    }
  }

  // Open Add Memory form
  function openMemoryForm() {
    setFormError("");

    setFormData({
      person: "",
      title: "",
      story: ""
    });

    setShowMemoryForm(true);
  }

  // Delete Memory API integration
  async function handleDeleteMemory(memoryId) {

    // Ask for confirmation before deleting
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this memory? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(memoryId);
      setError("");

      const response = await fetch(
        `${API_URL}/memories/${memoryId}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not delete memory."
        );
      }

      // Refresh records after deletion
      const refreshed = await fetchMemories();

      if (!refreshed) {
        setError(
          "Memory was deleted, but the archive could not be refreshed. Please reload the page."
        );
      }

    } catch (err) {
      setError(err.message);

    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app-shell">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >

        <div className="brand">

          <div className="brand-icon">
            <Ghost size={27} />
          </div>

          <div>
            <h2>EchoVault</h2>
            <span>THE MEMORY ARCHIVE</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>

        </div>

        <div className="sidebar-label">
          MAIN MENU
        </div>

        <nav>
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setSidebarOpen(false);
                }}
              >

                <Icon size={19} />

                <span>{item.name}</span>

                {activePage === item.name && (
                  <span className="active-dot" />
                )}

              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">

          <div className="moon-card">
            <Moon size={22} />

            <p>
              The night remembers everything.
            </p>

            <span>
              KEEP YOUR MEMORIES ALIVE
            </span>
          </div>

          <div className="privacy-status">
            <span className="online-dot" />
            <span>Local AI · Private storage</span>
          </div>

        </div>

      </aside>

      {/* Main content */}
      <main className="main-content">

        {/* Top navigation */}
        <header className="topbar">

          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu />
          </button>

          <div className="breadcrumb">
            ARCHIVE
            <ChevronRight size={14} />
            {activePage.toUpperCase()}
          </div>

          <div className="topbar-right">

            <span className="offline-badge">
              <span className="online-dot" />
              LOCAL MODE
            </span>

            <div className="avatar">
              E
            </div>

          </div>

        </header>

        <div className="page-container">

          {/* Backend error */}
          {error && (
            <div className="empty-state">
              {error}
            </div>
          )}

          {/* DASHBOARD */}
          {activePage === "Dashboard" && (
            <>

              <section className="hero">

                <div className="hero-content">

                  <div className="eyebrow">
                    <Sparkles size={14} />
                    WELCOME TO THE OTHER SIDE
                  </div>

                  <h1>
                    Some memories<br />
                    <span>never die.</span>
                  </h1>

                  <p>
                    Every story deserves to be remembered.
                    Welcome to your personal digital memory archive.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => {
                      setActivePage("Memory Vault");
                      openMemoryForm();
                    }}
                  >
                    <Plus size={18} />
                    Preserve a memory
                  </button>

                </div>

                <div className="hero-decoration">

                  <div className="moon-glow">
                    <Moon size={100} strokeWidth={1} />
                  </div>

                  <Ghost
                    className="hero-ghost"
                    size={115}
                    strokeWidth={1}
                  />

                  <span className="floating-star star-one">
                    ✦
                  </span>

                  <span className="floating-star star-two">
                    ✧
                  </span>

                  <span className="floating-star star-three">
                    ✦
                  </span>

                </div>

              </section>

              {/* Statistics */}
              <section className="stats-grid">

                <div className="stat-card">

                  <div className="stat-icon orange">
                    <BookHeart />
                  </div>

                  <span>Total memories</span>

                  <h2>
                    {isLoading ? "..." : totalMemories}
                  </h2>

                  <small>Stories preserved</small>

                </div>

                <div className="stat-card">

                  <div className="stat-icon purple">
                    <Heart />
                  </div>

                  <span>People remembered</span>

                  <h2>
                    {isLoading ? "..." : totalPeople}
                  </h2>

                  <small>Lives remembered</small>

                </div>

                <div className="stat-card">

                  <div className="stat-icon green">
                    <Ghost />
                  </div>

                  <span>AI status</span>

                  <h2 className="status-text">
                    Ready
                  </h2>

                  <small>Local model configured</small>

                </div>

              </section>

              {/* Recent memories */}
              <section className="section-heading">

                <div>
                  <div className="eyebrow">
                    FROM THE ARCHIVES
                  </div>

                  <h2>
                    Recently remembered
                  </h2>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActivePage("Memory Vault")}
                >
                  View all
                  <ChevronRight size={16} />
                </button>

              </section>

              <MemoryGrid
                memories={memories.slice(0, 3)}
                isLoading={isLoading}
                error={error}
                onDelete={handleDeleteMemory}
                deletingId={deletingId}
              />

            </>
          )}

          {/* MEMORY VAULT */}
          {activePage === "Memory Vault" && (
            <>

              <div className="page-title">

                <div className="eyebrow">
                  THE PRESERVATION ROOM
                </div>

                <h1>
                  Memory <span>Vault</span>
                </h1>

                <p>
                  Every memory is a piece of a life worth remembering.
                </p>

              </div>

              {/* Search and Add button */}
              <div className="vault-toolbar">

                <div className="search-box">

                  <Search size={18} />

                  <input
                    placeholder="Search memories..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />

                </div>

                <button
                  className="primary-button"
                  onClick={openMemoryForm}
                >
                  <Plus size={18} />
                  Add memory
                </button>

              </div>

              {/* Add Memory form */}
              {showMemoryForm && (
                <form
                  className="memory-form"
                  onSubmit={handleSaveMemory}
                >

                  <div className="form-heading">

                    <div>
                      <div className="eyebrow">
                        PRESERVE A MOMENT
                      </div>

                      <h2>
                        Save a new memory
                      </h2>
                    </div>

                    <button
                      type="button"
                      className="form-close"
                      onClick={() => {
                        setShowMemoryForm(false);
                        setFormError("");
                      }}
                    >
                      <X size={20} />
                    </button>

                  </div>

                  <label htmlFor="person">
                    Person's name
                  </label>

                  <input
                    id="person"
                    type="text"
                    placeholder="e.g. Grandfather"
                    value={formData.person}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        person: e.target.value
                      })
                    }
                    required
                  />

                  <label htmlFor="title">
                    Memory title
                  </label>

                  <input
                    id="title"
                    type="text"
                    placeholder="e.g. Childhood memories"
                    value={formData.title}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        title: e.target.value
                      })
                    }
                    required
                  />

                  <label htmlFor="story">
                    Memory story
                  </label>

                  <textarea
                    id="story"
                    rows="5"
                    placeholder="Write the story you want to preserve..."
                    value={formData.story}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        story: e.target.value
                      })
                    }
                    required
                  />

                  {formError && (
                    <p className="form-error">
                      {formError}
                    </p>
                  )}

                  <div className="form-actions">

                    <button
                      type="button"
                      className="cancel-button"
                      onClick={() => {
                        setShowMemoryForm(false);
                        setFormError("");
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={isSaving}
                    >
                      {isSaving
                        ? "Preserving..."
                        : "Save memory"}
                    </button>

                  </div>

                </form>
              )}

              {/* Memory cards */}
              <MemoryGrid
                memories={filteredMemories}
                isLoading={isLoading}
                error={error}
                onDelete={handleDeleteMemory}
                deletingId={deletingId}
              />

            </>
          )}

         
{/* GHOST CHAT */}
{activePage === "Ghost Chat" && (
  <div className="ghost-chat-page">

    <div className="page-title">
      <div className="eyebrow">
        <Sparkles size={14} />
        THE SPIRIT OF YOUR MEMORIES
      </div>

      <h1>
        Ghost <span>Chat</span>
      </h1>

      <p>
        Revisit the people and stories you've preserved.
        Your memories are waiting.
      </p>
    </div>

    <div className="chat-container">

      <div className="chat-header">
        <div className="chat-ghost-icon">
          <Ghost size={25} />
        </div>

        <div>
          <h3>EchoVault AI</h3>
          <span>
            <span className="online-dot" />
            Local AI · Qwen 2.5
          </span>
        </div>
      </div>

      <div className="chat-messages">

        {chatMessages.length === 0 && (
          <div className="chat-welcome">
            <Ghost size={48} />

            <h2>Welcome to Ghost Chat</h2>

            <p>
              Ask me about the memories you've saved.
              I'll search your archive and help you revisit them.
            </p>

            <div className="chat-suggestions">
              <button
                type="button"
                onClick={() =>
                  setChatInput("What memories have I saved?")
                }
              >
                What memories have I saved?
              </button>

              <button
                type="button"
                onClick={() =>
                  setChatInput("What did my grandfather enjoy?")
                }
              >
                What did my grandfather enjoy?
              </button>
            </div>
          </div>
        )}

        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${
              message.role === "user"
                ? "user-message"
                : "assistant-message"
            }`}
          >

            <div className="message-avatar">
              {message.role === "user" ? (
                <span>You</span>
              ) : (
                <Ghost size={19} />
              )}
            </div>

            <div className="message-content">
              <div className="message-bubble">
                {message.content}
              </div>

              {message.role === "assistant" &&
                message.retrievedMemories?.length > 0 && (
                  <div className="retrieved-memories">
                    <span>
                      <BookHeart size={14} />
                      Memories referenced
                    </span>

                    {message.retrievedMemories.map(memory => (
                      <div key={memory.id}>
                        {memory.title} · {memory.person}
                      </div>
                    ))}
                  </div>
                )}
            </div>

          </div>
        ))}

        {isChatLoading && (
          <div className="chat-message assistant-message">
            <div className="message-avatar">
              <Ghost size={19} />
            </div>

            <div className="message-bubble typing-indicator">
              EchoVault is remembering...
            </div>
          </div>
        )}

      </div>

      {chatError && (
        <p className="chat-error">
          {chatError}
        </p>
      )}

      <form
        className="chat-input-area"
        onSubmit={handleSendMessage}
      >
        <input
          type="text"
          placeholder="Ask something about your memories..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          disabled={isChatLoading}
        />

        <button
          type="submit"
          className="primary-button"
          disabled={!chatInput.trim() || isChatLoading}
        >
          <MessageCircle size={18} />
          {isChatLoading ? "Thinking..." : "Send"}
        </button>
      </form>

      <div className="chat-privacy-note">
        <Moon size={13} />
        Your memories stay on your device. Powered by local AI.
      </div>

    </div>
  </div>
)}


        </div>

        {/* Footer */}
        <footer>

          <span>
            © 2026 EchoVault
          </span>

          <span>
            BUILT WITH OPEN-SOURCE AI
            <Sparkles size={13} />
          </span>

        </footer>

      </main>

    </div>
  );


  async function handleSendMessage(event) {
  event.preventDefault();

  const message = chatInput.trim();

  if (!message || isChatLoading) return;

  // Display the user's message immediately
  setChatMessages(previous => [
    ...previous,
    {
      role: "user",
      content: message
    }
  ]);

  setChatInput("");
  setChatError("");
  setIsChatLoading(true);

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to get a response from EchoVault."
      );
    }

    // Display AI response and retrieved memories
    setChatMessages(previous => [
      ...previous,
      {
        role: "assistant",
        content: data.reply,
        retrievedMemories: data.retrieved_memories || []
      }
    ]);

  } catch (err) {
    setChatError(err.message);

  } finally {
    setIsChatLoading(false);
  }
}

}

// Memory cards component
function MemoryGrid({
  memories,
  isLoading,
  error,
  onDelete,
  deletingId
}) {

  if (isLoading) {
    return (
      <p className="empty-state">
        Opening your memory archive...
      </p>
    );
  }

  if (error) {
    return (
      <p className="empty-state">
        Unable to load memories.
      </p>
    );
  }

  if (memories.length === 0) {
    return (
      <p className="empty-state">
        No memories found in this archive.
      </p>
    );
  }

  return (
    <div className="memory-grid">

      {memories.map(memory => (

        <article
          className="memory-card"
          key={memory.id}
        >

          <div className="memory-card-top">

            <div className="memory-icon">
              <BookHeart size={22} />
            </div>

            <div className="memory-card-actions">

              <span className="memory-type">
                PRESERVED
              </span>

              <button
                type="button"
                className="delete-memory-button"
                title="Delete memory"
                aria-label={`Delete ${memory.title}`}
                disabled={deletingId === memory.id}
                onClick={() => onDelete(memory.id)}
              >
                <Trash2 size={17} />
              </button>

            </div>

          </div>

          <h3>
            {memory.title}
          </h3>

          <p>
            {memory.story}
          </p>

          <div className="memory-footer">

            <span>
              <Heart size={13} />
              {memory.person}
            </span>

            <span>
              <Clock size={13} />
              {formatDate(memory.created_at)}
            </span>

          </div>

        </article>

      ))}

    </div>
  );
}

// Format SQLite timestamp
function formatDate(dateString) {

  if (!dateString) {
    return "Date unavailable";
  }

  const date = new Date(
    dateString.replace(" ", "T") + "Z"
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export default App;
