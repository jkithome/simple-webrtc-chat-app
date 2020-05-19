import React, { useState, createContext } from "react";
import Container from "./Container";
import { MonetizeProvider } from 'react-monetize'

const ConnectionContext = createContext({
  connection: null,
  updateConnection: () => {}
});
const ChannelContext = createContext({
  channel: null,
  updateChannel: () => {}
});

const App = () => {
  const [connection, setconnection] = useState(null);
  const [channel, setChannel] = useState(null);
  const updateConnection = conn => {
    setconnection(conn);
  };
  const updateChannel = chn => {
    setChannel(chn);
  };
  return (
    <ConnectionContext.Provider value={{ connection, updateConnection }}>
      <ChannelContext.Provider value={{ channel, updateChannel }}>
      <MonetizeProvider paymentPointer="$coil.xrptipbot.com/da75ae04-5c0c-4662-8ce6-5470a4127d97">
        <Container />
      </MonetizeProvider>
      </ChannelContext.Provider>
    </ConnectionContext.Provider>
  );
};

export const ConnectionConsumer = ConnectionContext.Consumer
export const ChannelConsumer = ChannelContext.Consumer
export default App;
