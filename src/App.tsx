/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  MessageSquare, 
  Settings, 
  X, 
  Loader2, 
  Moon, 
  Sun,
  Sparkles,
  User,
  Bot,
  Download,
  AlertCircle
} from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type Mode = 'chat' | 'image';

export default function App() {
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [huggingFaceKey, setHuggingFaceKey] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedHuggingFaceKey = localStorage.getItem('huggingFaceKey');
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (savedHuggingFaceKey) setHuggingFaceKey(savedHuggingFaceKey);
    setIsDarkMode(savedDarkMode);
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('huggingFaceKey', huggingFaceKey);
    setIsSettingsOpen(false);
  };

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!huggingFaceKey) {
      setIsSettingsOpen(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${huggingFaceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen3-8B:nscale',
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response from Hugging Face');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!imagePrompt.trim() || isLoading) return;

    if (!huggingFaceKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const response = await fetch(
        'https://router.huggingface.co/nscale/v1/images/generations',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingFaceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            response_format: "b64_json",
            prompt: imagePrompt,
            model: "stabilityai/stable-diffusion-xl-base-1.0",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to generate image from Hugging Face');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].b64_json) {
          setGeneratedImage(`data:image/png;base64,${data.data[0].b64_json}`);
        } else if (data.data && data.data[0] && data.data[0].url) {
          setGeneratedImage(data.data[0].url);
        } else {
          throw new Error('Image data not found in JSON response');
        }
      } else {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setGeneratedImage(imageUrl);
      }
    } catch (error) {
      console.error('Image Error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate image.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-sans transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-[#131314]/80 backdrop-blur-md z-40 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-medium tracking-tight">AI Hub</h1>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1e1f20] p-1 rounded-full">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              mode === 'chat' 
                ? 'bg-white dark:bg-[#28292a] shadow-sm text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setMode('image')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              mode === 'image' 
                ? 'bg-white dark:bg-[#28292a] shadow-sm text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1e1f20] rounded-full transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1e1f20] rounded-full transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 max-w-3xl mx-auto px-4 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {mode === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col gap-6"
            >
              {messages.length === 0 && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                    <Sparkles className="text-white w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-medium mb-2">How can I help you today?</h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Ask me anything, from writing code to explaining complex topics.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gray-100 dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] rounded-tr-none'
                        : 'bg-transparent text-[#1f1f1f] dark:text-[#e3e3e3]'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </motion.div>
          ) : (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col gap-8"
            >
              <div className="text-center py-10">
                <h2 className="text-3xl font-medium mb-2">Image Generator</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Describe what you want to see, and I'll create it for you.
                </p>
              </div>

              {generatedImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-2xl mx-auto"
                >
                  <img 
                    src={generatedImage} 
                    alt="Generated" 
                    className="w-full h-auto object-cover min-h-[300px]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <a 
                      href={generatedImage} 
                      download="generated-image.png"
                      className="p-3 bg-white rounded-full text-black hover:scale-110 transition-transform"
                    >
                      <Download className="w-6 h-6" />
                    </a>
                  </div>
                </motion.div>
              )}

              {isLoading && (
                <div className="aspect-square w-full max-w-2xl mx-auto bg-gray-50 dark:bg-[#1e1f20] rounded-3xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-200 dark:border-gray-700 animate-pulse">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-500">Generating your masterpiece...</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent dark:from-[#131314] dark:via-[#131314] dark:to-transparent z-30">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={mode === 'chat' ? handleSendMessage : handleGenerateImage}
            className="relative group"
          >
            <input
              type="text"
              value={mode === 'chat' ? input : imagePrompt}
              onChange={(e) => mode === 'chat' ? setInput(e.target.value) : setImagePrompt(e.target.value)}
              placeholder={mode === 'chat' ? "Enter a prompt here" : "Describe the image you want to generate"}
              className="w-full bg-gray-100 dark:bg-[#1e1f20] hover:bg-gray-200 dark:hover:bg-[#28292a] focus:bg-white dark:focus:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] rounded-full py-4 pl-6 pr-14 outline-none border-2 border-transparent focus:border-blue-500/50 transition-all shadow-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (mode === 'chat' ? !input.trim() : !imagePrompt.trim())}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:bg-gray-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
          <p className="text-[10px] text-center mt-3 text-gray-400 dark:text-gray-500">
            AI can make mistakes. Check important info.
          </p>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1e1f20] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-medium">Settings</h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hugging Face API Key</label>
                  <input
                    type="password"
                    value={huggingFaceKey}
                    onChange={(e) => setHuggingFaceKey(e.target.value)}
                    placeholder="hf_..."
                    className="w-full bg-gray-50 dark:bg-[#131314] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-[11px] text-gray-500">Used for both Chat and Image Generation modes.</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Your API key is stored locally in your browser and never sent to our servers.
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
