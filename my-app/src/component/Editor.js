import React, { useEffect, useRef } from "react";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { ACTIONS } from "../Actions";

function Editor({ socketRef, roomId, onCodeChange, onCursorChange, suggestions}) {
  const editorRef = useRef(null);
  const currentSuggestionRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      // for sync the code
      editorRef.current = editor;

      editor.setSize(null, "100%");
      editor.on("cursorActivity", () => {
        const pos = editor.getCursor();
        const line = editor.getLine(pos.line);
        const cursorPosition = editor.indexFromPos(pos);
        onCursorChange(cursorPosition);

        // Remove previous ghost text
        if (currentSuggestionRef.current) {
          currentSuggestionRef.current.clear();
          currentSuggestionRef.current = null;
        }

        // Show ghost text suggestion if available
        if (suggestions && suggestions.length > 0) {
          const suggestion = suggestions[0];
          const currentToken = line.slice(0, pos.ch).match(/[\w\d]+$/)?.[0] || "";
          
          if (currentToken && suggestion.startsWith(currentToken)) {
            const ghostText = suggestion.slice(currentToken.length);
            const ghostMarker = document.createElement("span");
            ghostMarker.className = "cm-ghost-text";
            ghostMarker.textContent = ghostText;
            
            currentSuggestionRef.current = editor.markText(
              pos,
              pos,
              {
                replacedWith: ghostMarker,
                handleMouseEvents: true,
                atomic: true
              }
            );
          }
        }
      });
      editorRef.current.on("change", (instance, changes) => {
        // console.log("changes", instance ,  changes );
        const { origin } = changes;
        const code = instance.getValue(); // code has value which we write
        onCodeChange(code);
        if (origin !== "setValue") {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    };

    init();
  }, []);
  const style = document.createElement("style");
    style.textContent = `
      .cm-ghost-text {
        opacity: 0.5;
        color: #8b949e;
      }
    `;
    document.head.appendChild(style);

  // data receive from server
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code);
        }
      });
    }
    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
    };
  }, [socketRef.current]);

  return (
    <div style={{ height: "600px" }}>
      <textarea id="realtimeEditor"></textarea>
    </div>
  );
}

export default Editor;