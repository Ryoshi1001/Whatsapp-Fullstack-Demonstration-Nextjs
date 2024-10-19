import React from 'react'
import ChatHeader from './ChatHeader'
import ChatContainer from './ChatContainer'
import MessageBar from './MessageBar'

const Chat = () => {
  return (
    <div
    className='border-conversation-border bg-conversation-panel-background flex flex-col h-[100vh]'
    >
      <ChatHeader/>
      <ChatContainer/>
      <MessageBar/>
    </div>
  )
}

export default Chat