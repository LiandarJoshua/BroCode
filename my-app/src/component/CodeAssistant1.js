import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Code, Loader } from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE_URL = "http://localhost:5000/api";
const SESSION_ID = "user_123"; // Replace with a dynamic session ID if needed

const CodeAssistant = ({ currentCode, selectedLanguage, onSuggestion }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: SESSION_ID, // Maintain chat history
          message: input,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      const assistantMessage = { role: "assistant", content: data.response };

      setMessages((prev) => [...prev, assistantMessage]);

      // Extract code snippet if present
      if (data.response.includes("```")) {
        const codeMatch = data.response.match(/```(?:\w+)?\n([\s\S]+?)\n```/);
        if (codeMatch) {
          onSuggestion(codeMatch[1]); // Auto-suggest code
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error getting response from AI assistant.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="card bg-dark text-light h-100">
      <div className="card-header d-flex align-items-center border-bottom border-secondary">
        <Code className="me-2" size={20} />
        <h5 className="mb-0">Code Assistant</h5>
      </div>
      <div className="card-body d-flex flex-column" style={{ height: "calc(100% - 60px)" }}>
        <div className="flex-grow-1 overflow-auto mb-3">
          {messages.map((message, index) => (
            <div key={index} className={`d-flex ${message.role === "user" ? "justify-content-end" : "justify-content-start"} mb-2`}>
              <div className={`rounded p-2 ${message.role === "user" ? "bg-primary" : "bg-secondary"}`} style={{ maxWidth: "80%" }}>
                <pre className="mb-0" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                  {message.content}
                </pre>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="d-flex justify-content-start">
              <div className="bg-secondary rounded p-2">
                <Loader className="spinner-border spinner-border-sm" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-group">
          <input
            type="text"
            className="form-control bg-dark text-light border-secondary"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask for help or suggestions..."
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={isLoading}>
            <MessageSquare size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeAssistant;
