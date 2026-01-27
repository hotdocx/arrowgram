import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useDiagramStore } from '../store/diagramStore';
import { generateDiagram } from '../services/ai';
import { useSettingsStore } from '../store/settingsStore';
import { useToast } from '../context/ToastContext';

interface Message {
    role: 'user' | 'assistant';
    text: string;
    isError?: boolean;
}

interface AIChatContext {
    type: 'diagram' | 'paper';
    content: string;
    onUpdate: (content: string) => void;
}

interface AIChatPanelProps {
    context?: AIChatContext;
}

export function AIChatPanel({ context }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', text: 'Hello! I am the Arrowgram AI. Describe what you want to create, and I will generate it for you.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Fallback to store if no context provided (Legacy/Default behavior)
    const storeSpec = useDiagramStore(state => state.spec);
    const setStoreSpec = useDiagramStore(state => state.setSpec);

    const activeContext: AIChatContext = context || {
        type: 'diagram',
        content: storeSpec,
        onUpdate: setStoreSpec
    };

    const { apiKey } = useSettingsStore();
    const { addToast } = useToast();

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Check API Key existence first for better UX
            if (!apiKey) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: "Please set your Google Gemini API Key in Settings to use the AI features.",
                    isError: true
                }]);
                setIsTyping(false);
                return;
            }

            const responseContent = await generateDiagram(userMsg.text, activeContext.content, activeContext.type);

            // Validate if it is JSON for diagrams
            if (activeContext.type === 'diagram') {
                try {
                    JSON.parse(responseContent);
                    activeContext.onUpdate(responseContent);
                    setMessages(prev => [...prev, { role: 'assistant', text: "I've updated the diagram based on your request." }]);
                    addToast("Diagram generated successfully", "success");
                } catch (e) {
                    console.error("Invalid JSON from AI:", responseContent);
                    setMessages(prev => [...prev, { role: 'assistant', text: "I generated a response, but it wasn't valid diagram code. Please try again." }]);
                }
            } else {
                // For Papers, just update
                activeContext.onUpdate(responseContent);
                setMessages(prev => [...prev, { role: 'assistant', text: "I've updated the paper based on your request." }]);
                addToast("Paper updated successfully", "success");
            }

        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', text: error.message || "Something went wrong.", isError: true }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shadow-lg">
            <div className="p-4 border-b bg-purple-50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-purple-600" size={20} />
                    <h3 className="font-bold text-gray-800">AI Assistant</h3>
                </div>
                {!apiKey && (
                    <div title="API Key Missing" className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-600'}`}>
                            {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                        </div>
                        <div className={`p-3 rounded-lg text-sm max-w-[80%] ${msg.role === 'assistant' ? (msg.isError ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-white border border-gray-100 shadow-sm') : 'bg-blue-600 text-white'}`}>
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
                        placeholder={apiKey ? "Ask to draw a diagram..." : "Set API Key to start"}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={!apiKey && messages.length > 1} // Disable only if we've already warned them, or let them type and hit error again
                    />
                    <button
                        onClick={handleSend}
                        className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!input.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}