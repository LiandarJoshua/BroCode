import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';

const CodeSuggestions = ({ code, language, cursorPosition }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const fetchSuggestions = useCallback(async () => {
    if (!code || !cursorPosition) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          cursorPosition,
        }),
      });
      
      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [code, language, cursorPosition]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [fetchSuggestions]);

  return (
    <div className="absolute z-50 bg-gray-800 rounded-md shadow-lg border border-gray-700">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className={`px-3 py-2 cursor-pointer ${
            index === selectedIndex ? 'bg-gray-700' : ''
          } hover:bg-gray-700`}
        >
          <span className="text-gray-400">{suggestion}</span>
        </div>
      ))}
    </div>
  );
};

const CodeAnalysis = ({ code, language }) => {
  const [improvements, setImprovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeCode = useCallback(async () => {
    if (!code) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });
      
      const data = await response.json();
      if (data.suggestions) {
        setImprovements(data.suggestions);
      }
    } catch (error) {
      console.error('Error analyzing code:', error);
    } finally {
      setIsLoading(false);
    }
  }, [code, language]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      analyzeCode();
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [analyzeCode]);

  return (
    <div className="bg-gray-800 p-4 rounded-md mt-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="text-yellow-500" size={20} />
        <h3 className="text-lg font-semibold text-white">Code Improvements</h3>
      </div>
      {isLoading ? (
        <div className="text-gray-400">Analyzing code...</div>
      ) : (
        <ul className="space-y-2">
          {improvements.map((improvement, index) => (
            <li key={index} className="text-gray-300 flex items-start gap-2">
              <span className="text-yellow-500">•</span>
              <span>{improvement}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export { CodeSuggestions, CodeAnalysis };