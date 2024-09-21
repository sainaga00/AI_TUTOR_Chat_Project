import React, { useState, useRef, useEffect } from "react";

const MainChat = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [finalMsg, setFinalMsg] = useState(""); // To store progressively built message
  const [isStreaming, setIsStreaming] = useState(false); // Track if the bot is streaming
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, finalMsg]);

  const handleSend = () => {
    if (input.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "user", text: input },
      ]);
      setInput("");

      fetch("http://127.0.0.1:5000/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      }).then(() => {
        const eventSource = new EventSource("http://127.0.0.1:5000/stream");

        setFinalMsg("");
        setIsStreaming(true);

        let accumulatedMessage = "";

        eventSource.onmessage = (event) => {
          if (event.data === "[DONE]") {
            setMessages((prevMessages) => [
              ...prevMessages,
              { sender: "bot", text: accumulatedMessage },
            ]);
            setIsStreaming(false);
            eventSource.close();
          } else {
            // Accumulate each chunk and update finalMsg
            console.log(event.data);
            accumulatedMessage += event.data;
            setFinalMsg(accumulatedMessage);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE Error", error);
          setIsStreaming(false);
          eventSource.close();
        };
      });
    }
  };

  const renderMessage = (text) => {
    const formattedText = text
      .replace(/\n/g, "<br>")   
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>"); 
    return { __html: formattedText };
  };

  return (
    <div className="flex flex-col bg-gray-100 p-12 w-3/4 h-screen">
      <div className="flex-grow bg-white shadow-lg rounded-lg overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`my-2 p-2 rounded-md ${
              message.sender === "bot"
                ? "bg-gray-200 text-left"
                : "bg-blue-400 text-white self-end"
            }`}
          >
            <div className="flex items-start">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  message.sender === "bot"
                    ? "bg-gray-500 text-white"
                    : "bg-blue-500 text-white"
                }`}
              >
                {message.sender === "bot" ? "🤖" : "👤"}
              </div>
              <div 
                dangerouslySetInnerHTML={renderMessage(message.text)}
                className="formatted-content"
              />
            </div>
          </div>
        ))}

        {isStreaming && finalMsg.length > 0 && (
          <div className="my-2 p-2 rounded-md bg-gray-200">
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-500 text-white mr-2">
                🤖
              </div>
              <div 
                dangerouslySetInnerHTML={renderMessage(finalMsg)}
                className="formatted-content"
              />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex mt-4">
        <input
          type="text"
          className="flex-grow p-2 border rounded-l-lg"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default MainChat;