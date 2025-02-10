import React, { useState, useEffect } from 'react';
import { Loader, Plus, Trash2, PlayCircle } from 'lucide-react';

const TestCases = ({ code, language, onRunTests }) => {
  const [testCases, setTestCases] = useState([]);
  const [input, setInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Load saved test cases when component mounts
  useEffect(() => {
    const savedTestCases = JSON.parse(localStorage.getItem(`testCases_${language}`)) || [];
    setTestCases(savedTestCases);
  }, [language]);

  // Save test cases whenever they change
  useEffect(() => {
    localStorage.setItem(`testCases_${language}`, JSON.stringify(testCases));
  }, [testCases, language]);

  const addTestCase = () => {
    if (input.trim() && expectedOutput.trim()) {
      const newTestCase = {
        id: Date.now(), // Unique ID for each test case
        input: input.trim(),
        expectedOutput: expectedOutput.trim(),
        timestamp: new Date().toISOString()
      };
      
      setTestCases(prevTestCases => [...prevTestCases, newTestCase]);
      setInput('');
      setExpectedOutput('');
    }
  };

  const removeTestCase = (index) => {
    setTestCases(prevTestCases => prevTestCases.filter((_, i) => i !== index));
    setResults(prevResults => prevResults.filter((_, i) => i !== index));
  };

  const runTests = async () => {
    setIsRunning(true);
    const newResults = [];
    
    try {
      for (const testCase of testCases) {
        try {
          const result = await onRunTests(testCase.input);
          const passed = result.trim() === testCase.expectedOutput.trim();
          newResults.push({
            passed,
            actual: result,
            expected: testCase.expectedOutput,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          newResults.push({
            passed: false,
            actual: error.message,
            expected: testCase.expectedOutput,
            error: true,
            timestamp: new Date().toISOString()
          });
        }
      }
    } finally {
      setResults(newResults);
      setIsRunning(false);
      
      // Save test results
      localStorage.setItem(`testResults_${language}`, JSON.stringify(newResults));
    }
  };

  const clearAllTestCases = () => {
    if (window.confirm('Are you sure you want to clear all test cases?')) {
      setTestCases([]);
      setResults([]);
      localStorage.removeItem(`testCases_${language}`);
      localStorage.removeItem(`testResults_${language}`);
    }
  };

  return (
    <div className="bg-dark text-light p-3 rounded">
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="mb-0">Test Cases</h5>
          {testCases.length > 0 && (
            <button 
              className="btn btn-outline-danger btn-sm"
              onClick={clearAllTestCases}
            >
              Clear All
            </button>
          )}
        </div>
        
        <div className="mb-4">
          <div className="mb-3">
            <label className="form-label">Input</label>
            <textarea
              className="form-control bg-dark text-light border-secondary"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter test case input..."
              rows="2"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Expected Output</label>
            <textarea
              className="form-control bg-dark text-light border-secondary"
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              placeholder="Enter expected output..."
              rows="2"
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={addTestCase}
            disabled={!input.trim() || !expectedOutput.trim()}
          >
            <Plus size={16} className="me-2" />
            Add Test Case
          </button>
        </div>

        <div className="test-cases-list">
          {testCases.map((testCase, index) => (
            <div key={testCase.id} className="bg-secondary p-3 rounded mb-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0">Test Case {index + 1}</h6>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeTestCase(index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mb-2">
                <strong>Input:</strong>
                <pre className="bg-dark text-light p-2 rounded mb-1">{testCase.input}</pre>
              </div>
              <div className="mb-2">
                <strong>Expected Output:</strong>
                <pre className="bg-dark text-light p-2 rounded mb-1">{testCase.expectedOutput}</pre>
              </div>
              {results[index] && (
                <div className={`alert ${results[index].passed ? 'alert-success' : 'alert-danger'} mb-0 mt-2`}>
                  <strong>{results[index].passed ? 'Passed ✓' : 'Failed ✗'}</strong>
                  {!results[index].passed && (
                    <div className="mt-2">
                      <div>Expected: {results[index].expected}</div>
                      <div>Actual: {results[index].actual}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {testCases.length > 0 && (
          <button
            className="btn btn-success w-100"
            onClick={runTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader className="spinner-border spinner-border-sm me-2" />
            ) : (
              <PlayCircle size={16} className="me-2" />
            )}
            Run All Tests
          </button>
        )}
      </div>
    </div>
  );
};

export default TestCases;