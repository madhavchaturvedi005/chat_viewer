import React, { useState, useEffect, useRef } from 'react';
import { Upload, Search, MoreVertical, Paperclip, Smile, Mic, Phone, Video, Info, MessageCircle, Heart, Send, ChevronUp, ChevronDown, X } from 'lucide-react';

interface Message {
  date: string;
  time: string;
  sender: string;
  message: string;
  platform: string;
  reactions?: { emoji: string; user: string }[];
}

interface Chat {
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
}

export default function ChatViewer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState('');
  const [platform, setPlatform] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  const contactNames: Record<string, string> = {};

  const parseWhatsAppFile = (text: string): Message[] => {
    const lines = text.split('\n');
    const parsed: Message[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }

      const match = line.match(/^(\d{2}\/\d{2}\/\d{2}),\s+(\d{1,2}:\d{2}\s+(?:am|pm))\s+-\s+([^:]+):\s+(.+)$/i);
      
      if (match) {
        const sender = match[3].trim();
        let message = match[4].trim();
        
        // Set current user as the first sender encountered
        if (!currentUser && sender) {
          setCurrentUser(sender);
        }
        
        i++;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine && !nextLine.match(/^\d{2}\/\d{2}\/\d{2},\s+\d{1,2}:\d{2}\s+(?:am|pm)/i)) {
            message += '\n' + nextLine;
            i++;
          } else {
            break;
          }
        }
        
        parsed.push({
          date: match[1].trim(),
          time: match[2].trim(),
          sender: contactNames[sender] || sender,
          message: message,
          platform: 'whatsapp'
        });
      } else {
        i++;
      }
    }

    return parsed;
  };

  const parseInstagramHTML = (html: string): Message[] => {
    const parsed: Message[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const messageBlocks = doc.querySelectorAll('.pam._3-95._2ph-._a6-g');
    
    messageBlocks.forEach(block => {
      const senderElem = block.querySelector('h2._3-95._2pim._a6-h._a6-i');
      const messageElem = block.querySelector('._3-95._a6-p');
      const timeElem = block.querySelector('._3-94._a6-o');
      const reactionsElem = block.querySelector('ul._a6-q');
      
      if (senderElem && messageElem && timeElem) {
        let sender = senderElem.textContent.trim();
        sender = contactNames[sender] || sender;
        
        // Set current user as the first sender encountered
        if (!currentUser && sender) {
          setCurrentUser(sender);
        }
        
        const messageDiv = messageElem.querySelector('div > div:nth-child(2)');
        let message = messageDiv ? messageDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim() : '';
        
        const timeText = timeElem.textContent.trim();
        const timeMatch = timeText.match(/([A-Za-z]+\s+\d+,\s+\d+)\s+(\d+:\d+\s+[ap]m)/i);
        
        let reactions: { emoji: string; user: string }[] = [];
        if (reactionsElem) {
          const reactionItems = reactionsElem.querySelectorAll('li span');
          reactionItems.forEach(item => {
            const text = item.textContent?.trim() || '';
            const match = text.match(/^(.)(.+)$/);
            if (match) {
              reactions.push({ emoji: match[1], user: match[2] });
            }
          });
        }
        
        if (message && message !== 'मैसेज को लाइक किया है') {
          parsed.push({
            date: timeMatch ? timeMatch[1] : timeText,
            time: timeMatch ? timeMatch[2] : '',
            sender: sender,
            message: message,
            reactions: reactions,
            platform: 'instagram'
          });
        }
      }
    });
    
    return parsed.reverse();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetPlatform: 'whatsapp' | 'instagram') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      let parsedMessages: Message[] = [];
      let detectedPlatform: 'whatsapp' | 'instagram' = targetPlatform;
      
      if (file.name.endsWith('.html')) {
        parsedMessages = parseInstagramHTML(content);
        detectedPlatform = 'instagram';
      } else {
        parsedMessages = parseWhatsAppFile(content);
        detectedPlatform = 'whatsapp';
      }
      
      setMessages(prevMessages => {
        const newMessages: Message[] = [...prevMessages];
        parsedMessages.forEach(msg => {
          if (!newMessages.find(m => m.date === msg.date && m.time === msg.time && m.message === msg.message)) {
            newMessages.push(msg);
          }
        });
        return newMessages;
      });
      setPlatform(detectedPlatform);
    };
    
    reader.readAsText(file);
  };

  const groupMessagesByDate = (msgs: Message[]): Record<string, Message[]> => {
    const groups: Record<string, Message[]> = {};
    
    msgs.forEach(msg => {
      if (!groups[msg.date]) {
        groups[msg.date] = [];
      }
      groups[msg.date].push(msg);
    });
    
    return groups;
  };

  const currentPlatformMessages = messages.filter(msg => msg.platform === platform);
  
  // Group messages by chat (sender)
  const chatGroups: Record<string, Message[]> = {};
  currentPlatformMessages.forEach(msg => {
    const otherPerson = msg.sender === currentUser ? 
      currentPlatformMessages.find(m => m.sender !== currentUser && m.sender !== msg.sender)?.sender || 'Unknown' 
      : msg.sender;
    
    if (!chatGroups[otherPerson]) {
      chatGroups[otherPerson] = [];
    }
    chatGroups[otherPerson].push(msg);
  });

  // Get unique chats
  const chats: Chat[] = Object.keys(chatGroups).map(person => {
    const msgs = chatGroups[person];
    const lastMsg = msgs[msgs.length - 1];
    return {
      name: person,
      lastMessage: lastMsg.message.substring(0, 40) + (lastMsg.message.length > 40 ? '...' : ''),
      time: lastMsg.time,
      unread: 0
    };
  });

  const activeChatName = selectedChat || (chats.length > 0 ? chats[0].name : 'Chat');
  
  const filteredMessages = currentPlatformMessages.filter(msg => 
    msg.sender === activeChatName || 
    (msg.sender === currentUser && currentPlatformMessages.some(m => m.sender === activeChatName))
  );
  
  const messageGroups = groupMessagesByDate(filteredMessages);
  const chatName = activeChatName;

  // Find search matches
  useEffect(() => {
    if (searchQuery.trim()) {
      const matches: number[] = [];
      filteredMessages.forEach((msg, index) => {
        if (msg.message.toLowerCase().includes(searchQuery.toLowerCase())) {
          matches.push(index);
        }
      });
      setSearchMatches(matches);
      if (matches.length > 0) {
        setCurrentMatchIndex(0);
        // Scroll to first match after a short delay to ensure refs are set
        setTimeout(() => {
          if (messageRefs.current[matches[0]]) {
            messageRefs.current[matches[0]]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 100);
      }
    } else {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
    }
  }, [searchQuery]);

  // Scroll to current match when navigating
  const scrollToMatch = (index: number) => {
    if (searchMatches.length > 0 && messageRefs.current[searchMatches[index]]) {
      isUserScrolling.current = false;
      messageRefs.current[searchMatches[index]]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // Handle user scrolling
  const handleScroll = () => {
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    isUserScrolling.current = true;
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 1000);
  };

  const goToNextMatch = () => {
    if (searchMatches.length > 0) {
      const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
      setCurrentMatchIndex(nextIndex);
      scrollToMatch(nextIndex);
    }
  };

  const goToPrevMatch = () => {
    if (searchMatches.length > 0) {
      const prevIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
      setCurrentMatchIndex(prevIndex);
      scrollToMatch(prevIndex);
    }
  };

  const highlightText = (text: string, query: string, isCurrentMatch: boolean): React.ReactNode => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className={isCurrentMatch ? "bg-orange-400" : "bg-yellow-300"}>{part}</mark>
        : part
    );
  };

  const renderWhatsAppUI = () => (
    <>
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold">
            {chatName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold">{chatName}</h2>
            <p className="text-xs text-green-100">tap for info</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Search 
            className="w-5 h-5 cursor-pointer" 
            onClick={() => setShowSearch(!showSearch)}
          />
          <MoreVertical className="w-5 h-5 cursor-pointer" />
        </div>
      </div>

      {showSearch && (
        <div className="bg-white px-4 py-3 border-b flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm"
            autoFocus
          />
          {searchQuery && (
            <>
              <span className="text-xs text-gray-600">
                {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
              </span>
              <button
                onClick={goToPrevMatch}
                disabled={searchMatches.length === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                title="Previous match"
              >
                <ChevronUp className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={goToNextMatch}
                disabled={searchMatches.length === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                title="Next match"
              >
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
                className="p-1 hover:bg-gray-100 rounded"
                title="Close search"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2" 
        style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 30L0 0h60L30 30zM30 30l30 30H0l30-30z' fill='%23e5ddd5' fill-opacity='0.1'/%3E%3C/svg%3E")`,
        backgroundColor: '#e5ddd5'
      }}>
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date} className="mb-4">
            <div className="flex justify-center my-3">
              <div className="bg-white bg-opacity-90 rounded-md px-3 py-1 shadow-sm">
                <p className="text-xs text-gray-600">{date}</p>
              </div>
              </div>
              
              {msgs.map((msg, idx) => {
                const globalIndex = filteredMessages.findIndex(m => m === msg);
                const isSent = msg.sender === currentUser;
                const isCurrentMatch = searchMatches.length > 0 && searchMatches[currentMatchIndex] === globalIndex;
                
                return (
                  <div 
                    key={idx} 
                    ref={(el) => messageRefs.current[globalIndex] = el}
                    className={`flex mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-lg px-3 py-2 shadow ${
                      isSent 
                        ? 'bg-green-100 rounded-br-none' 
                        : 'bg-white rounded-bl-none'
                    }`}>
                      {!isSent && (
                        <p className="text-xs font-semibold text-green-600 mb-1">{msg.sender}</p>
                      )}
                      <p className="text-gray-800 text-sm break-words whitespace-pre-wrap">
                        {highlightText(msg.message, searchQuery, isCurrentMatch)}
                      </p>
                      <p className="text-xs text-gray-500 text-right mt-1">{msg.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-t">
        <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center gap-2">
          <Smile className="w-5 h-5 text-gray-500 cursor-pointer" />
          <input 
            type="text" 
            placeholder="Type a message"
            className="flex-1 outline-none text-sm"
            disabled
          />
          <Paperclip className="w-5 h-5 text-gray-500 cursor-pointer" />
        </div>
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center cursor-pointer">
          <Mic className="w-5 h-5 text-white" />
        </div>
      </div>
    </>
  );

  const renderInstagramUI = () => (
    <>
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full p-0.5">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <span className="text-gray-700 font-semibold text-sm">{chatName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-sm">{chatName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Search 
            className="w-5 h-5 cursor-pointer text-gray-700" 
            onClick={() => setShowSearch(!showSearch)}
          />
          <Phone className="w-5 h-5 cursor-pointer text-gray-700" />
          <Video className="w-5 h-5 cursor-pointer text-gray-700" />
          <Info className="w-5 h-5 cursor-pointer text-gray-700" />
        </div>
      </div>

      {showSearch && (
        <div className="bg-white px-4 py-3 border-b flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm"
            autoFocus
          />
          {searchQuery && (
            <>
              <span className="text-xs text-gray-600">
                {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
              </span>
              <button
                onClick={goToPrevMatch}
                disabled={searchMatches.length === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                title="Previous match"
              >
                <ChevronUp className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={goToNextMatch}
                disabled={searchMatches.length === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                title="Next match"
              >
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
                className="p-1 hover:bg-gray-100 rounded"
                title="Close search"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 bg-white">
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date} className="mb-4">
            <div className="flex justify-center my-4">
              <div className="bg-gray-200 rounded-full px-3 py-1">
                <p className="text-xs text-gray-600 font-medium">{date}</p>
              </div>
            </div>
            
            {msgs.map((msg, idx) => {
              const globalIndex = filteredMessages.findIndex(m => m === msg);
              const isSent = msg.sender === currentUser;
              const isCurrentMatch = searchMatches.length > 0 && searchMatches[currentMatchIndex] === globalIndex;
              
              return (
                <div 
                  key={idx} 
                  ref={(el) => messageRefs.current[globalIndex] = el}
                  className={`flex mb-3 ${isSent ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md`}>
                    <div className={`rounded-3xl px-4 py-2 ${
                      isSent 
                        ? 'bg-blue-500 text-white rounded-br-md' 
                        : 'bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200'
                    }`}>
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {highlightText(msg.message, searchQuery, isCurrentMatch)}
                      </p>
                    </div>
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                        {msg.reactions.map((r, i) => (
                          <span key={i} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5">
                            {r.emoji}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className={`text-xs text-gray-400 mt-1 ${isSent ? 'text-right' : 'text-left'}`}>{msg.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="bg-white px-4 py-3 flex items-center gap-2 border-t">
        <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2">
          <Smile className="w-5 h-5 text-gray-500 cursor-pointer" />
          <input 
            type="text" 
            placeholder="Message..."
            className="flex-1 outline-none text-sm bg-transparent"
            disabled
          />
        </div>
        <Heart className="w-6 h-6 text-gray-700 cursor-pointer" />
      </div>
    </>
  );

  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Sidebar */}
      {messages.length > 0 && (
        <div className="w-16 bg-white border-r flex flex-col items-center py-4 gap-6">
          <div 
            className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
              platform === 'whatsapp' ? 'bg-green-100' : 'hover:bg-gray-100'
            }`}
            onClick={() => {
              setPlatform('whatsapp');
              setSelectedChat(null);
              setSearchQuery('');
              setShowSearch(false);
            }}
          >
            <MessageCircle className={`w-6 h-6 ${platform === 'whatsapp' ? 'text-green-600' : 'text-gray-600'}`} />
          </div>
          <div 
            className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
              platform === 'instagram' ? 'bg-pink-100' : 'hover:bg-gray-100'
            }`}
            onClick={() => {
              setPlatform('instagram');
              setSelectedChat(null);
              setSearchQuery('');
              setShowSearch(false);
            }}
          >
            <Send className={`w-6 h-6 ${platform === 'instagram' ? 'text-pink-600' : 'text-gray-600'}`} />
          </div>
          <label className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors mt-auto">
            <Upload className="w-6 h-6 text-gray-600" />
            <input
              type="file"
              accept=".txt,.html"
              onChange={(e) => handleFileUpload(e, platform)}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Chat List Sidebar */}
      {messages.length > 0 && chats.length > 0 && (
        <div className={`w-80 border-r flex flex-col ${platform === 'whatsapp' ? 'bg-white' : 'bg-white'}`}>
          {/* Chat List Header */}
          <div className={`px-4 py-4 border-b ${platform === 'whatsapp' ? 'bg-gray-50' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold text-gray-800">
              {platform === 'whatsapp' ? 'Chats' : 'Messages'}
            </h2>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {chats.map((chat, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedChat(chat.name);
                  setSearchQuery('');
                  setShowSearch(false);
                }}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer border-b hover:bg-gray-50 transition-colors ${
                  selectedChat === chat.name || (!selectedChat && idx === 0) ? 'bg-gray-100' : ''
                }`}
              >
                {/* Profile Picture */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  platform === 'whatsapp' 
                    ? 'bg-gray-300 text-gray-700' 
                    : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5'
                }`}>
                  {platform === 'instagram' ? (
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <span className="font-semibold text-sm text-gray-700">{chat.name.charAt(0).toUpperCase()}</span>
                    </div>
                  ) : (
                    <span className="font-semibold">{chat.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">{chat.name}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{chat.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Chat Viewer</h1>
                <p className="text-gray-600 mb-6">Upload WhatsApp (.txt) or Instagram (.html) chat exports</p>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".txt,.html"
                    onChange={(e) => handleFileUpload(e, 'whatsapp')}
                    className="hidden"
                  />
                  <span className="inline-block bg-gradient-to-r from-green-500 to-pink-500 text-white px-8 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium">
                    Choose Chat File
                  </span>
                </label>
              </div>
            </div>
          </div>
        ) : currentPlatformMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <div className="text-center">
                <div className={`w-20 h-20 ${platform === 'whatsapp' ? 'bg-green-500' : 'bg-pink-500'} rounded-full mx-auto mb-4 flex items-center justify-center`}>
                  {platform === 'whatsapp' ? (
                    <MessageCircle className="w-10 h-10 text-white" />
                  ) : (
                    <Send className="w-10 h-10 text-white" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  No {platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'} Messages
                </h2>
                <p className="text-gray-600 mb-6">
                  Upload a {platform === 'whatsapp' ? 'WhatsApp .txt' : 'Instagram .html'} file to view messages here
                </p>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept={platform === 'whatsapp' ? '.txt' : '.html'}
                    onChange={(e) => handleFileUpload(e, platform)}
                    className="hidden"
                  />
                  <span className={`inline-block ${platform === 'whatsapp' ? 'bg-green-500 hover:bg-green-600' : 'bg-pink-500 hover:bg-pink-600'} text-white px-8 py-3 rounded-lg transition-colors font-medium`}>
                    Upload {platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'} Chat
                  </span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <>
            {platform === 'whatsapp' ? renderWhatsAppUI() : renderInstagramUI()}
          </>
        )}
      </div>
    </div>
  );
}