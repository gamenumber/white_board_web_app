import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import styled from "styled-components";

const socket = io("http://localhost:3001");

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background-color: ${(props) => props.bgColor};
    height: 100vh;
`;

const Header = styled.h1`
    color: #2c3e50;
    margin-bottom: 20px;
`;

const Input = styled.input`
    padding: 10px;
    margin-bottom: 20px;
    border: 2px solid #2c3e50;
    border-radius: 5px;
    font-size: 16px;
`;

const Canvas = styled.canvas`
    border: 2px solid #2c3e50;
    border-radius: 5px;
    cursor: crosshair;
`;

const NicknameLabel = styled.div`
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: purple;
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 16px;
`;

function Whiteboard() {
    const [nickname, setNickname] = useState("");
    const [isDrawing, setIsDrawing] = useState(false);
    const [isErasing, setIsErasing] = useState(false);
    const [isTextMode, setIsTextMode] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [bgColor, setBgColor] = useState("#f0f8ff");
    const [showNicknameLabel, setShowNicknameLabel] = useState(false);
    const canvasRef = useRef(null);
    const contextRef = useRef(null);

    useEffect(() => {
        if (showWhiteboard) {
            const canvas = canvasRef.current;
            canvas.width = window.innerWidth * 2;
            canvas.height = window.innerHeight * 2;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;

            const context = canvas.getContext("2d");
            context.scale(2, 2);
            context.lineCap = "round";
            context.strokeStyle = "black";
            context.lineWidth = 5;
            contextRef.current = context;

            socket.on("draw", ({ x, y, type, color, text }) => {
                contextRef.current.strokeStyle = color;
                if (type === "start") {
                    contextRef.current.beginPath();
                    contextRef.current.moveTo(x, y);
                } else if (type === "draw") {
                    contextRef.current.lineTo(x, y);
                    contextRef.current.stroke();
                } else if (type === "erase") {
                    contextRef.current.clearRect(x - 10, y - 10, 20, 20);
                } else if (type === "clear") {
                    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
                } else if (type === "text") {
                    contextRef.current.font = "20px Arial";
                    contextRef.current.fillStyle = "black";
                    contextRef.current.fillText(text, x, y);
                }
            });
        }
    }, [showWhiteboard]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Delete" && showWhiteboard) {
                const canvas = canvasRef.current;
                const context = contextRef.current;
                context.clearRect(0, 0, canvas.width, canvas.height);
                socket.emit("draw", { type: "clear" });
            } else if (e.key === "t" || e.key === "T") {
                setIsTextMode(true);
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === "t" || e.key === "T") {
                setIsTextMode(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [showWhiteboard]);

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && nickname.trim()) {
            setShowWhiteboard(true);
            setBgColor("#ffffff");
        }
    };

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY, button } = nativeEvent;
        if (isTextMode && button === 0) { // Check if T is pressed and left mouse button is clicked
            const text = prompt("Enter text:");
            if (text) {
                contextRef.current.font = "20px Arial";
                contextRef.current.fillStyle = "black";
                contextRef.current.fillText(text, offsetX, offsetY);
                socket.emit("draw", { x: offsetX, y: offsetY, type: "text", text });
            }
            setIsTextMode(false); // Disable text mode after entering text
        } else if (button === 2) {
            setIsErasing(true);
            contextRef.current.clearRect(offsetX - 10, offsetY - 10, 20, 20);
            socket.emit("draw", { x: offsetX, y: offsetY, type: "erase" });
        } else {
            contextRef.current.beginPath();
            contextRef.current.moveTo(offsetX, offsetY);
            setIsDrawing(true);
            socket.emit("draw", { x: offsetX, y: offsetY, type: "start", color: "black" });
        }
    };

    const draw = ({ nativeEvent }) => {
        const { offsetX, offsetY, buttons } = nativeEvent;
        if (isErasing && buttons === 2) {
            contextRef.current.clearRect(offsetX - 10, offsetY - 10, 20, 20);
            socket.emit("draw", { x: offsetX, y: offsetY, type: "erase" });
        } else if (isDrawing) {
            contextRef.current.lineTo(offsetX, offsetY);
            contextRef.current.stroke();
            socket.emit("draw", { x: offsetX, y: offsetY, type: "draw", color: "black" });
        }
    };

    const stopDrawing = () => {
        contextRef.current.closePath();
        setIsDrawing(false);
        setIsErasing(false);
    };

    const handleMouseMove = () => {
        setShowNicknameLabel(true);
        clearTimeout(window.nicknameTimeout);
        window.nicknameTimeout = setTimeout(() => {
            setShowNicknameLabel(false);
        }, 2000);
    };

    return (
        <Container bgColor={bgColor} onMouseMove={handleMouseMove}>
            <Header>Real-time Collaborative Whiteboard</Header>
            {!showWhiteboard && (
                <Input
                    type="text"
                    placeholder="Enter your nickname and press Enter"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
            )}
            {showWhiteboard && (
                <>
                    {showNicknameLabel && (
                        <NicknameLabel>{nickname}</NicknameLabel>
                    )}
                    <Canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
                    />
                </>
            )}
        </Container>
    );
}

export default Whiteboard;
