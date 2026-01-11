import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useDiagramStore } from '../store/diagramStore';

export function AIChatPanel() {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am the Arrowgram AI. Describe a commutative diagram, and I will try to generate it for you.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const setSpec = useDiagramStore(state => state.setSpec);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulation of AI processing
        setTimeout(() => {
            let responseText = "I created a diagram based on your request.";

            // Simple heuristic for demo purposes
            if (input.toLowerCase().includes('pushout')) {
                const pushoutSpec = {
                    nodes: [
                        { name: "A", left: 100, top: 100, label: "A" },
                        { name: "B", left: 300, top: 100, label: "B" },
                        { name: "C", left: 100, top: 300, label: "C" },
                        { name: "D", left: 300, top: 300, label: "D" }
                    ],
                    arrows: [
                        { from: "A", to: "B", label: "f" },
                        { from: "A", to: "C", label: "g" },
                        { from: "B", to: "D", label: "i₁" },
                        { from: "C", to: "D", label: "i₂" }
                    ]
                };
                setSpec(JSON.stringify(pushoutSpec, null, 2));
                responseText = "Here is a standard pushout square.";
            } else if (input.toLowerCase().includes('triangle')) {
                const triangleSpec = {
                    nodes: [
                        { name: "A", left: 200, top: 100, label: "A" },
                        { name: "B", left: 100, top: 300, label: "B" },
                        { name: "C", left: 300, top: 300, label: "C" }
                    ],
                    arrows: [
                        { from: "A", to: "B", label: "f" },
                        { from: "A", to: "C", label: "g" },
                        { from: "B", to: "C", label: "h" }
                    ]
                };
                setSpec(JSON.stringify(triangleSpec, null, 2));
                responseText = "I've drawn a commutative triangle for you.";
            } else {
                responseText = "I'm just a demo stub right now, but I can generate a 'pushout' or 'triangle' if you ask!";
            }

            setMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shadow-lg">
            <div className="p-4 border-b bg-purple-50 flex items-center gap-2">
                <Sparkles className="text-purple-600" size={20} />
                <h3 className="font-bold text-gray-800">AI Assistant</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-600'}`}>
                            {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                        </div>
                        <div className={`p-3 rounded-lg text-sm max-w-[80%] ${msg.role === 'assistant' ? 'bg-white border border-gray-100 shadow-sm' : 'bg-blue-600 text-white'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Bot size={16} /></div>
                        <div className="text-gray-400 text-sm flex items-center">Thinking...</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ask to draw a diagram..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
