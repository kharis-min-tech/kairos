'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Search, MoreVertical, Phone, Video, Check, CheckCheck, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import { Button, Badge, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '1', name: 'Pastor James', avatar: 'PJ', lastMessage: 'See you at the meeting tomorrow', lastMessageTime: '2024-01-15T14:30:00Z', unreadCount: 2, online: true },
  { id: '2', name: 'Sarah Williams', avatar: 'SW', lastMessage: 'Thank you for the update!', lastMessageTime: '2024-01-15T12:15:00Z', unreadCount: 0, online: true },
  { id: '3', name: 'David Chen', avatar: 'DC', lastMessage: 'I\'ll bring the materials for Sunday', lastMessageTime: '2024-01-15T10:00:00Z', unreadCount: 1, online: false },
  { id: '4', name: 'Grace Okonkwo', avatar: 'GO', lastMessage: 'The outreach event was wonderful', lastMessageTime: '2024-01-14T18:45:00Z', unreadCount: 0, online: false },
  { id: '5', name: 'Youth Leaders Group', avatar: 'YL', lastMessage: 'Michael: Let\'s plan the retreat', lastMessageTime: '2024-01-14T16:20:00Z', unreadCount: 5, online: false },
];

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  '1': [
    { id: 'm1', senderId: 'other', text: 'Good morning! How are the preparations going for Sunday?', timestamp: '2024-01-15T09:00:00Z', read: true },
    { id: 'm2', senderId: 'me', text: 'Everything is on track. The worship team has been rehearsing all week.', timestamp: '2024-01-15T09:05:00Z', read: true },
    { id: 'm3', senderId: 'other', text: 'Excellent! We\'re expecting about 200 attendees.', timestamp: '2024-01-15T09:10:00Z', read: true },
    { id: 'm4', senderId: 'me', text: 'Great. I\'ve coordinated with the ushers and parking team.', timestamp: '2024-01-15T09:15:00Z', read: true },
    { id: 'm5', senderId: 'other', text: 'Perfect. We also need to discuss the outreach program budget.', timestamp: '2024-01-15T14:00:00Z', read: true },
    { id: 'm6', senderId: 'me', text: 'Sure, I have the numbers ready. Shall we go over them at tomorrow\'s meeting?', timestamp: '2024-01-15T14:15:00Z', read: true },
    { id: 'm7', senderId: 'other', text: 'See you at the meeting tomorrow', timestamp: '2024-01-15T14:30:00Z', read: false },
  ],
  '2': [
    { id: 'm1', senderId: 'me', text: 'Hi Sarah, just wanted to let you know the department report is ready.', timestamp: '2024-01-15T11:00:00Z', read: true },
    { id: 'm2', senderId: 'other', text: 'Thank you for the update!', timestamp: '2024-01-15T12:15:00Z', read: true },
  ],
};

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<string>('1');
  const [showChat, setShowChat] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setShowChat(true);
  };

  const messages = MOCK_MESSAGES[selectedConversation] ?? [];
  const currentConversation = MOCK_CONVERSATIONS.find((c) => c.id === selectedConversation);

  const filteredConversations = MOCK_CONVERSATIONS.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Messages' }]} />
      <PageHeader title="Messages" description="Direct messaging" />

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-16rem)]">
          {/* Conversation list */}
          <div className={cn('w-full border-r md:block md:w-80 md:shrink-0', showChat ? 'hidden' : 'block')}>
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Search conversations"
                />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 57px)' }}>
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50',
                    selectedConversation === conversation.id && 'bg-muted',
                  )}
                  aria-label={`Chat with ${conversation.name}`}
                >
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {conversation.avatar}
                    </div>
                    {conversation.online && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{conversation.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conversation.lastMessageTime), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs text-muted-foreground">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className={cn('flex flex-1 flex-col', showChat ? 'flex' : 'hidden md:flex')}>
            {/* Chat header */}
            {currentConversation && (
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setShowChat(false)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {currentConversation.avatar}
                    </div>
                    {currentConversation.online && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{currentConversation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentConversation.online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" aria-label="Voice call">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Video call">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="More options">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.senderId === 'me';
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2.5',
                          isMe
                            ? 'rounded-br-sm bg-primary text-primary-foreground'
                            : 'rounded-bl-sm bg-muted',
                        )}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <div
                          className={cn(
                            'mt-1 flex items-center justify-end gap-1 text-xs',
                            isMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
                          )}
                        >
                          <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                          {isMe && (
                            msg.read
                              ? <CheckCheck className="h-3 w-3" />
                              : <Check className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message input */}
            <div className="border-t p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" aria-label="Attach file">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Emoji">
                  <Smile className="h-4 w-4" />
                </Button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 rounded-full border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Message input"
                />
                <Button
                  size="sm"
                  disabled={!messageInput.trim()}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
