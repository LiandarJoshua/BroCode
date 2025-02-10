  import React, { useEffect, useRef, useState } from "react";
  import Client from "./Client";
  import Editor from "./Editor";
  import { initSocket } from "../Socket";
  import { ACTIONS } from "../Actions";
  import { useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
  import { toast } from "react-hot-toast";
  import axios from "axios";
  import { MessageSquare, Code, Loader,Zap, AlertTriangle,Bug,X } from 'lucide-react';
  import { CodeSuggestions, CodeAnalysis } from './CodeSuggestions';
  import TestCases from './TestCases';
  import VoiceChat from './VoiceChat';

  

  const API_BASE_URL = 'http://127.0.0.1:5000/api';

  const LANGUAGES = [
    "python3", "java", "cpp", "nodejs", "c", "ruby", "go", "scala", "bash", "sql",
    "pascal", "csharp", "php", "swift", "rust", "r"
  ];
  
  
  // CodeAssistant Component
  const CodeAssistant = ({ currentCode, selectedLanguage, onSuggestion }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => Math.random().toString(36).substring(7));
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const generateCompletion = async (prompt) => {
      try {
        const response = await fetch(`${API_BASE_URL}/completion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentCode,
            language: selectedLanguage,
            prompt,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Completion API error');
        }
        
        const data = await response.json();
        return data.completion;
      } catch (error) {
        console.error('Error generating completion:', error);
        throw error;
      }
    };

    const sendChatMessage = async (message) => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            message,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Chat API error');
        }
        
        const data = await response.json();
        return data.response;
      } catch (error) {
        console.error('Error sending chat message:', error);
        throw error;
      }
    };

    const handleSend = async () => {
      if (!input.trim()) return;

      const userMessage = {
        role: 'user',
        content: input,
      };

      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      try {
        let response;
        if (input.toLowerCase().includes('code') || input.toLowerCase().includes('function')) {
          response = await generateCompletion(input);
        } else {
          response = await sendChatMessage(input);
        }
        
        const assistantMessage = {
          role: 'assistant',
          content: response,
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (response.includes('```')) {
          const codeMatch = response.match(/```(?:\w+)?\n([\s\S]+?)\n```/);
          if (codeMatch) {
            onSuggestion(codeMatch[1]);
          }
        }
      } catch (error) {
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
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
        <div className="card-body d-flex flex-column" style={{ height: 'calc(100% - 60px)' }}>
          <div className="flex-grow-1 overflow-auto mb-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`d-flex ${message.role === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-2`}
              >
                <div
                  className={`rounded p-2 ${
                    message.role === 'user'
                      ? 'bg-primary'
                      : 'bg-secondary'
                  }`}
                  style={{ maxWidth: '80%' }}
                >
                  <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
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
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={isLoading}
            >
              <MessageSquare size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  function EditorPage() {
    const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const codeRef = useRef(null);
  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const socketRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [showTestCases, setShowTestCases] = useState(false);
  const runTestCase = async (testInput) => {
    try {
      const response = await fetch(`${API_BASE_URL}/run-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: codeRef.current,
          language: selectedLanguage,
          input: testInput
        }),
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data.output;
    } catch (error) {
      throw error;
    }
  };
  
    // Fetch supported languages\
    const handleCursorChange = (position) => {
      setCursorPosition(position);
      fetchSuggestions(position);
    };
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    useEffect(() => {
      if (suggestionsRef.current && showSuggestions) {
        const activeElement = suggestionsRef.current.children[activeSuggestionIndex + 1]; // +1 for header
        if (activeElement) {
          activeElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
          });
        }
      }
    }, [activeSuggestionIndex, showSuggestions]);
    

  // Add keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault();
          applySuggestion(suggestions[activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const applySuggestion = (suggestion) => {
    if (!codeRef.current) return;
    
    // Get the current line and character position
    const lines = codeRef.current.split('\n');
    let currentLine = 0;
    let currentChar = 0;
    let totalChars = 0;
    
    while (totalChars + lines[currentLine].length + 1 <= cursorPosition) {
      totalChars += lines[currentLine].length + 1;
      currentLine++;
    }
    currentChar = cursorPosition - totalChars;

    // Find the start of the current word
    const line = lines[currentLine];
    let wordStart = currentChar;
    while (wordStart > 0 && /[\w.]/.test(line[wordStart - 1])) {
      wordStart--;
    }

    // Calculate the replacement range
    const beforeWord = line.slice(0, wordStart);
    const afterWord = line.slice(currentChar);
    lines[currentLine] = beforeWord + suggestion + afterWord;

    // Update the code
    const newCode = lines.join('\n');
    codeRef.current = newCode;
    socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
      roomId,
      code: newCode,
    });

    setShowSuggestions(false);
    setActiveSuggestionIndex(0);
  };
  
    // New function to fetch code suggestions
    const fetchSuggestions = async (position) => {
      if (!codeRef.current) return;
  
      try {
        const response = await fetch(`${API_BASE_URL}/suggest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: codeRef.current,
            cursorPosition: position,
            language: selectedLanguage,
          }),
        });
  
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const data = await response.json();
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
        
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    const [isDebugging, setIsDebugging] = useState(false);
    const [debugInfo, setDebugInfo] = useState(null);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
    const debugCode = async () => {
      if (!codeRef.current) return;
      
      setIsDebugging(true);
      try {
        const response = await fetch(`${API_BASE_URL}/debug`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: codeRef.current,
            language: selectedLanguage,
          }),
        });
  
        if (!response.ok) throw new Error('Failed to debug code');
        
        const data = await response.json();
        setDebugInfo(data);
        setShowDebugInfo(true);

        
        if (data.error) {
          toast.error('Debugging found issues');
        } else {
          toast.success('No syntax errors found');
        }
      } catch (error) {
        console.error('Error debugging code:', error);
        toast.error('Failed to debug code');
      } finally {
        setIsDebugging(false);
      }
    };
  
    // New function to analyze code
    const analyzeCode = async () => {
      if (!codeRef.current) return;
      
      setIsAnalyzing(true);
      try {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: codeRef.current,
            language: selectedLanguage,
          }),
        });
  
        if (!response.ok) throw new Error('Failed to analyze code');
        
        const data = await response.json();
        setAnalysis(data.suggestions);
        setShowAnalysis(true);

      } catch (error) {
        console.error('Error analyzing code:', error);
        toast.error('Failed to analyze code');
      } finally {
        setIsAnalyzing(false);
      }
    };
    useEffect(() => {
      const fetchLanguages = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/languages`);
          if (!response.ok) {
            throw new Error('Failed to fetch languages');
          }
          const languages = await response.json();
          setSupportedLanguages(languages);
        } catch (error) {
          console.error('Error fetching supported languages:', error);
          setSupportedLanguages(LANGUAGES); // Fallback to default languages
        }
      };
      fetchLanguages();
    }, []);

    // Health check
    useEffect(() => {
      const checkHealth = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/health`);
          const data = await response.json();
          if (data.status !== 'healthy') {
            toast.error('Backend service is not healthy');
          }
        } catch (error) {
          console.error('Health check failed:', error);
          toast.error('Unable to connect to backend service');
        }
      };
      
      checkHealth();
      const interval = setInterval(checkHealth, 60000);
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      const init = async () => {
        socketRef.current = await initSocket();
        socketRef.current.on("connect_error", handleErrors);
        socketRef.current.on("connect_failed", handleErrors);

        function handleErrors(err) {
          console.log("Error", err);
          toast.error("Socket connection failed, Try again later");
          navigate("/");
        }

        socketRef.current.emit(ACTIONS.JOIN, {
          roomId,
          username: Location.state?.username,
        });

        socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
          if (username !== Location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current, socketId });
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        });
      };
      init();

      return () => {
        socketRef.current?.disconnect();
        socketRef.current?.off(ACTIONS.JOINED);
        socketRef.current?.off(ACTIONS.DISCONNECTED);
      };
    }, []);

    if (!Location.state) {
      return <Navigate to="/" />;
    }

    const copyRoomId = async () => {
      try {
        await navigator.clipboard.writeText(roomId);
        toast.success("Room ID copied");
      } catch (error) {
        console.log(error);
        toast.error("Unable to copy the room ID");
      }
    };
    

    const leaveRoom = () => navigate("/");

    const runCode = async () => {
      setIsCompiling(true);
      try {
        const response = await fetch(`${API_BASE_URL}/compile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: codeRef.current,
            language: selectedLanguage,
          }),
        });
        
        const data = await response.json();
        if (data.error) {
          setOutput(`Error: ${data.error}`);
        } else {
          setOutput(data.output || 'No output');
        }
      } catch (error) {
        setOutput(`Error: ${error.message}`);
      } finally {
        setIsCompiling(false);
      }
    };

    const handleCodeSuggestion = (suggestion) => {
      if (codeRef.current !== null) {
        codeRef.current = suggestion;
        socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: suggestion,
        });
      }
    };
    const roomTestCases = new Map();

function getTestCasesForRoom(roomId) {
  return roomTestCases.get(roomId) || [];
}

function setTestCasesForRoom(roomId, testCases) {
  roomTestCases.set(roomId, testCases);
}
    return (
      <div className="container-fluid vh-100 d-flex flex-column">
        <div className="row flex-grow-1">
          {/* Left Sidebar */}
          <div className="col-md-3 col-lg-2 bg-dark text-light d-flex flex-column p-3">
            <img 
              src="https://static.vecteezy.com/system/resources/previews/010/332/153/non_2x/code-flat-color-outline-icon-free-png.png"
              alt="Logo" 
              className="img-fluid mx-auto" 
              style={{ maxWidth: "120px", marginBottom: "10px" }} 
            />
            <hr />
            <div className="flex-grow-1 overflow-auto" style={{ maxHeight: "60vh" }}>
              <span className="mb-2">Members</span>
              {clients.map((client) => (
                <Client key={client.socketId} username={client.username} />
              ))}
            </div>
            <hr />
            <div className="mt-auto">
              <button className="btn btn-success w-100 mb-2" onClick={copyRoomId}>
                Copy Room ID
              </button>
              <button className="btn btn-danger w-100" onClick={leaveRoom}>
                Leave Room
              </button>
            </div>
          </div>
          
          {/* Main Editor Area */}
          <div className={`col-md-${isAssistantOpen ? '6' : '9'} col-lg-${isAssistantOpen ? '7' : '10'} text-light d-flex flex-column`}>
          <div className="bg-dark p-2 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <select 
                className="form-select w-auto me-2" 
                value={selectedLanguage} 
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                {(supportedLanguages.length > 0 ? supportedLanguages : LANGUAGES).map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <button 
                className="btn btn-outline-info me-2"
                onClick={analyzeCode}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader className="spinner-border spinner-border-sm" /> : <AlertTriangle size={20} />}
                Analyze Code
              </button>
              <button 
                className="btn btn-outline-warning me-2"
                onClick={debugCode}
                disabled={isDebugging}
              >
                {isDebugging ? <Loader className="spinner-border spinner-border-sm" /> : <Bug size={20} />}
                Debug Code
              </button>
            </div>
            <button 
              className="btn btn-outline-light"
              onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            >
              {isAssistantOpen ? 'Hide Assistant' : 'Show Assistant'}
            </button>
            <button 
    className="btn btn-outline-primary me-2"
    onClick={() => setShowTestCases(!showTestCases)}
  >
    {showTestCases ? 'Hide Test Cases' : 'Show Test Cases'}
  </button>
          </div>
          
          {/* Analysis Box */}
          {showAnalysis && analysis.length > 0 && (
            <div className="bg-dark border-bottom border-secondary p-2">
              <div className="d-flex align-items-center mb-2 justify-content-between">
                <div className="d-flex align-items-center">
                  <AlertTriangle size={16} className="text-warning me-2" />
                  <span className="text-light">Code Analysis Suggestions:</span>
                </div>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowAnalysis(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <ul className="list-unstyled m-0">
                {analysis.map((suggestion, index) => (
                  <li key={index} className="text-info mb-1">• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Debug Info Box */}
          {showDebugInfo && debugInfo && (debugInfo.error || debugInfo.suggestions) && (
            <div className="bg-dark border-bottom border-secondary p-2">
              <div className="d-flex align-items-center mb-2 justify-content-between">
                <div className="d-flex align-items-center">
                  <Bug size={16} className="text-warning me-2" />
                  <span className="text-light">Debug Information:</span>
                </div>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowDebugInfo(false)}
                >
                  <X size={16} />
                </button>
              </div>
              {debugInfo.error && (
                <div className="text-danger mb-2">{debugInfo.error}</div>
              )}
              {debugInfo.suggestions && (
                <div className="text-info">
                  <strong>Suggestions:</strong>
                  <div className="mt-1">{debugInfo.suggestions}</div>
                </div>
              )}
            </div>
            
          )}
          
          {showTestCases && (
  <div className="mt-3">
    <TestCases
      code={codeRef.current}
      language={selectedLanguage}
      onRunTests={runTestCase}
      socketRef={socketRef}
      roomId={roomId}/>
  </div>
)}
          
          
          
  
            <Editor 
              socketRef={socketRef} 
              roomId={roomId} 
              onCodeChange={(code) => (codeRef.current = code)}
              onCursorChange={handleCursorChange}
            />
            
  
            {showSuggestions && suggestions.length > 0 && (
              <div className="position-absolute bg-dark border border-secondary rounded p-2" 
                   style={{ 
                     zIndex: 1000,
                     maxWidth: '200px',
                     maxHeight: '200px',
                     overflowY: 'auto',
                     left: '25%', // Position to the right of the cursor
                     top:'7.5%',
                     marginLeft: '10px' 
                   }}>
                    <div className="border-bottom border-secondary pb-1 mb-2">
                  <small className="text-muted">Suggestions</small>
                </div>
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="suggestion-item p-1 cursor-pointer hover:bg-secondary"
                    onClick={() => {
                      const newCode = codeRef.current.slice(0, cursorPosition) +   
                                    suggestion + 
                                    codeRef.current.slice(cursorPosition);
                      codeRef.current = newCode;
                      socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code: newCode,
                      });
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
  
          {/* Code Assistant Panel */}
          {isAssistantOpen && (
            <div className="col-md-3 col-lg-3 bg-dark p-0">
              <CodeAssistant
                currentCode={codeRef.current}
                selectedLanguage={selectedLanguage}
                onSuggestion={handleCodeSuggestion}
              />
            </div>
          )}
        </div>
        <VoiceChat 
  socketRef={socketRef}
  roomId={roomId}
  username={Location.state?.username}
/>
  
        {/* Compiler Button and Window */}
        <button 
          className="btn btn-primary position-fixed bottom-0 end-0 m-3" 
          onClick={() => setIsCompileWindowOpen(!isCompileWindowOpen)} 
          style={{ zIndex: 1050 }}
        >
          {isCompileWindowOpen ? "Close Compiler" : "Open Compiler"}
        </button>
  
        {isCompileWindowOpen && (
          <div className="bg-dark text-light p-3 position-fixed bottom-0 left-0 right-0" style={{ height: "30vh", overflowY: "auto", zIndex: 1040 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="m-0">Compiler Output ({selectedLanguage})</h5>
              <div>
                <button className="btn btn-success me-2" onClick={runCode} disabled={isCompiling}>
                  {isCompiling ? "Compiling..." : "Run Code"}
                </button>
                <button className="btn btn-secondary" onClick={() => setIsCompileWindowOpen(false)}>Close</button>
              </div>
            </div>
            <pre className="bg-secondary p-3 rounded">{output || "Output will appear here after compilation"}</pre>
          </div>
        )}
      </div>
    );
  }

  export default EditorPage;