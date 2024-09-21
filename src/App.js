import React, { useState } from "react";
import MainChat from "./components/MainChat";

function App() {
  const [passkey, setPasskey] = useState("");
  const [verifiedID, setVerifiedID] = useState(false);

  const handleKey = (event) => {
    if (event.key === "Enter") {
      if (event.target.value === "13221") {
        setVerifiedID(true);
      } else {
        alert("Wrong Passkey!!!"); 
        setVerifiedID(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-700">GIAC Tutor</h1>
        <p className="text-gray-500 text-sm mt-2">v0.0.2 (07/02/2024)</p>
        <div className="mt-4 p-4 bg-blue-100 rounded-lg">
          <p className="text-sm">
            This is a prototype of the GIAC Tutor. Please do not share any
            sensitive information.
          </p>
          <p className="text-sm mt-2">
            If you wish to provide a suggestion or report an issue, please
            contact Prof. Smith (
            <a href="mailto:smith515@usf.edu" className="text-blue-600">
              smith515@usf.edu
            </a>
            ). In the title of the email, please include "GIAC Tutor Feedback".
          </p>
        </div>

        {/* Passkey Input */}
        <div className="mt-6">
          <label
            htmlFor="passkey"
            className="block text-sm font-medium text-gray-700"
          >
            Tester Passkey
          </label>
          <div className="mt-2 relative">
            <input
              type="text"
              id="passkey"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              onKeyDown={handleKey}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <>
        {!verifiedID ? (
          <div className="w-3/4 p-12 flex items-center justify-center">
            <div className="max-w-lg text-center">
              <h1 className="text-4xl font-bold text-gray-800">
                💬Virtual Tutor
              </h1>
              <p className="mt-4 text-sm text-gray-600">
                Please enter your Tester Passkey key into the sidebar to
                continue. If forgotten or lost it, please contact Prof. Smith (
                <a href="mailto:smith515@usf.edu" className="text-blue-600">
                  smith515@usf.edu
                </a>
                ).
              </p>
            </div>
          </div>
        ) : (
          <MainChat />
        )}
      </>
    </div>
  );
}
export default App;
