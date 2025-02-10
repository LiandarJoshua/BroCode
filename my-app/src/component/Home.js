import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("Room Id is generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }

    // redirect
    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    });
    toast.success("Room is created");
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="container-fluid bg-light-grey">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div className="col-12 col-md-6">
          <div className="card shadow-lg p-4 mb-5 rounded" style={{ backgroundColor: "#f0f0f0" }}>
            <div className="card-body text-center">
              <img
                src="/images\codeitup (2).png"
                alt="Logo"
                className="img-fluid mx-auto d-block"
                style={{ maxWidth: "160px" }}
              />
              <h4 className="card-title text-dark mb-4" style={{ fontWeight: "600" }}>
                Enter the Join Key
              </h4>

              <div className="form-group mb-3">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="form-control mb-3"
                  placeholder="Key"
                  style={{
                    borderRadius: "25px",
                    padding: "15px",
                    border: "1px solid #d1d1d1",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    backgroundColor: "#eaeaea",
                  }}
                  onKeyUp={handleInputEnter}
                />
              </div>
              <div className="form-group mb-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-control mb-3"
                  placeholder="USERNAME"
                  style={{
                    borderRadius: "25px",
                    padding: "15px",
                    border: "1px solid #d1d1d1",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    backgroundColor: "#eaeaea",
                  }}
                  onKeyUp={handleInputEnter}
                />
              </div>
              <button
                onClick={joinRoom}
                className="btn btn-dark btn-lg btn-block"
                style={{
                  borderRadius: "25px",
                  background: "#333",
                  padding: "15px",
                  fontWeight: "600",
                  border: "none",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => (e.target.style.background = "#444")}
                onMouseOut={(e) => (e.target.style.background = "#333")}
              >
                JOIN
              </button>
              <p className="mt-4 text-dark">
                Don't have a room key? Create{" "}
                <span
                  onClick={generateRoomId}
                  className="text-muted p-2"
                  style={{
                    cursor: "pointer",
                    fontWeight: "600",
                    textDecoration: "underline",
                  }}
                >
                  New Room
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
