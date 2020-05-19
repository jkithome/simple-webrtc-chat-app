import React, { Fragment, useState, useEffect, useRef } from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Button,
  Loader
} from "semantic-ui-react";
import SweetAlert from "react-bootstrap-sweetalert";
import { format } from "date-fns";
import "./App.css";
import UsersList from "./UsersList";
import MessageBox from "./MessageBox";
import Paho from "paho-mqtt"

// Use for remote connections
const configuration = {
  iceServers: [{ url: "stun:stun.1.google.com:19302" }]
};

// Use for local connections
// const configuration = null;

const Chat = ({ connection, updateConnection, channel, updateChannel }) => {
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [connectedTo, setConnectedTo] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [alert, setAlert] = useState(null);
  const connectedRef = useRef();
  const webSocket = useRef(null);
  const [message, setMessage] = useState("");
  const messagesRef = useRef({});
  const [messages, setMessages] = useState({});

  const client = useRef(null)

  useEffect(() => {
    // webSocket.current = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL);
    // webSocket.current.onmessage = message => {
    //   const data = JSON.parse(message.data);
    //   setSocketMessages(prev => [...prev, data]);
    // };
    // webSocket.current.onclose = () => {
    //   webSocket.current.close();
    // };
    // return () => webSocket.current.close();

    webSocket.current = new WebSocket('ws://bitcoinofthings.com:1884');

    const clientID = "bot-demo-ws-" + parseInt(Math.random() * 100);
    const host = "mqtt.bitcoinofthings.com"
    const port = "1884"
    const isSSL = true
    const usessl = (isSSL && port === "8884")
    const username = "demo"
    const password = "demo"
    client.current = new Paho.Client(host, Number(port), clientID)
    // Set callback handlers
    //client.onConnectionLost = onConnectionLost
    client.current.onMessageArrived = onMessageArrived
    client.current.connect({ 
      useSSL: usessl,
      userName: username,
      password: password,
      onSuccess: onConnect
    })

  }, []);

  // Called when the client connects
function onConnect() {
  setSocketOpen(true);
  client.current.subscribe("demo");
  console.log("subscribed to demo topic")
}

// Called when a message arrives
function onMessageArrived(message) {
  console.log("onMessageArrived: " + message.payloadString);
  const data = JSON.parse(message.payloadString)
  setSocketMessages(prev => [...prev, data])
}

  useEffect(() => {
    let data = socketMessages.pop();
    if (data) {
      console.log("effect data")
      console.log(data)
      switch (data.type) {
        case "connect":
          setSocketOpen(true);
          break;
        case "login":
          onLogin(data);
          break;
        case "updateUsers":
          updateUsersList(data);
          break;
        case "removeUser":
          removeUser(data);
          break;
        case "offer":
          onOffer(data);
          break;
        case "answer":
          onAnswer(data);
          break;
        case "candidate":
          onCandidate(data);
          break;
        default:
          console.log("other message received")
          console.log(data)
          break;
      }
    }
  }, [socketMessages]);

  const closeAlert = () => {
    setAlert(null);
  };

  const send = data => {
    //webSocket.current.send(JSON.stringify(data));
    client.current.publish("demo",JSON.stringify(data))
  };

  const handleLogin = () => {
    setLoggingIn(true);
    // todo: broker should do login
    // for now, in demo mode
    // users should be array of logged in users
    // back end will need to maintain
    send({
      type: "login",
      name,
      success: true,
      message:"This is just a demo",
      users: [{key:name, userName: name}]
    });
  };

  const updateUsersList = ({ user }) => {
    setUsers(prev => [...prev, user]);
  };

  const removeUser = ({ user }) => {
    setUsers(prev => prev.filter(u => u.userName !== user.userName));
  }

  const handleDataChannelMessageReceived = ({ data }) => {
    const message = JSON.parse(data);
    const { name: user } = message;
    let messages = messagesRef.current;
    let userMessages = messages[user];
    if (userMessages) {
      userMessages = [...userMessages, message];
      let newMessages = Object.assign({}, messages, { [user]: userMessages });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      let newMessages = Object.assign({}, messages, { [user]: [message] });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    }
  };

  const onLogin = ({ success, message, users: loggedIn }) => {
    setLoggingIn(false);
    if (success) {
      setAlert(
        <SweetAlert
          success
          title="Success!"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          Logged in successfully!
        </SweetAlert>
      );
      setIsLoggedIn(true);
      setUsers(loggedIn);

      //setup connection to peer
      //can we pass webrtc message over mqtt???
      let localConnection = new RTCPeerConnection(configuration);
      //when the browser finds an ice candidate we send it to another peer
      localConnection.onicecandidate = ({ candidate }) => {
        let connectedTo = connectedRef.current;

        if (candidate && !!connectedTo) {
          send({
            name: connectedTo,
            type: "candidate",
            candidate
          });
        }
      };
      localConnection.ondatachannel = event => {
        console.log("Data channel is created!");
        let receiveChannel = event.channel;
        receiveChannel.onopen = () => {
          console.log("Data channel is open and ready to be used.");
        };
        receiveChannel.onmessage = handleDataChannelMessageReceived;
        updateChannel(receiveChannel);
      };
      updateConnection(localConnection);
    } else {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          {message}
        </SweetAlert>
      );
    }
  };

  //when somebody wants to message us
  const onOffer = ({ offer, name }) => {
    setConnectedTo(name);
    connectedRef.current = name;

    // connection
    //   .setRemoteDescription(new RTCSessionDescription(offer))
    //   .then(() => connection.createAnswer())
    //   //erroring, not sure what it does
    //   //.then(answer => connection.setLocalDescription(answer))
    //   .then(() =>
        send({ type: "answer", answer: connection.localDescription, name })
      // )
      // .catch(e => {
      //   console.log({ e });
      //   setAlert(
      //     <SweetAlert
      //       warning
      //       confirmBtnBsStyle="danger"
      //       title="Failed"
      //       onConfirm={closeAlert}
      //       onCancel={closeAlert}
      //     >
      //       There was an error accepting offer.
      //     </SweetAlert>
      //   );
      // });
  }

  //when another user answers to our offer
  const onAnswer = ({ answer }) => {
    console.log('thanks for accepting. you are now connected')
    //connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  //when we got ice candidate from another user
  const onCandidate = ({ candidate }) => {
    console.log('we dont do ice candidates')
    //connection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  //when a user clicks the send message button
  const sendMsg = () => {
    const time = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    let text = { time, message, name };
    let messages = messagesRef.current;
    let connectedTo = connectedRef.current;
    let userMessages = messages[connectedTo];
    if (messages[connectedTo]) {
      userMessages = [...userMessages, text];
      let newMessages = Object.assign({}, messages, {
        [connectedTo]: userMessages
      });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      userMessages = Object.assign({}, messages, { [connectedTo]: [text] });
      messagesRef.current = userMessages;
      setMessages(userMessages);
    }
    //just send it to group, set up channels later
    //channel.send(JSON.stringify(text));
    send(JSON.stringify(text));
    setMessage("");
  };

  //try connecting to user?
  const handleConnection = name => {
    // var dataChannelOptions = {
    //   reliable: true
    // };

    let dataChannel = connection.createDataChannel("messenger");

    dataChannel.onerror = error => {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          An error has occurred.
        </SweetAlert>
      );
    };

    dataChannel.onmessage = handleDataChannelMessageReceived;
    updateChannel(dataChannel);

    connection
      .createOffer()
      .then(offer => connection.setLocalDescription(offer))
      .then(() =>
        send({ type: "offer", offer: connection.localDescription, name })
      )
      .catch(e =>
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has occurred.
          </SweetAlert>
        )
      );
  };

  const toggleConnection = userName => {
    console.log("toggleConnection")
    if (connectedRef.current === userName) {
      setConnecting(true);
      setConnectedTo("");
      connectedRef.current = "";
      setConnecting(false);
    } else {
      setConnecting(true);
      setConnectedTo(userName);
      connectedRef.current = userName;
      handleConnection(userName);
      setConnecting(false);
    }
  };
  return (
    <div className="App">
      {alert}
      <Header as="h2" icon>
        <Icon name="users" />
        Web Monetization Chat App
      </Header>
      {(socketOpen && (
        <Fragment>
          <Grid centered columns={4}>
            <Grid.Column>
              {(!isLoggedIn && (
                <Input
                  fluid
                  disabled={loggingIn}
                  type="text"
                  onChange={e => setName(e.target.value)}
                  placeholder="Username..."
                  action
                >
                  <input />
                  <Button
                    color="teal"
                    disabled={!name || loggingIn}
                    onClick={handleLogin}
                  >
                    <Icon name="sign-in" />
                    Login
                  </Button>
                </Input>
              )) || (
                <Segment raised textAlign="center" color="olive">
                  Logged In as: {name}
                </Segment>
              )}
            </Grid.Column>
          </Grid>
          <Grid>
            <UsersList
              users={users}
              toggleConnection={toggleConnection}
              connectedTo={connectedTo}
              connection={connecting}
            />
            <MessageBox
              messages={messages}
              connectedTo={connectedTo}
              message={message}
              setMessage={setMessage}
              sendMsg={sendMsg}
              name={name}
            />
          </Grid>
        </Fragment>
      )) || (
        <Loader size="massive" active inline="centered">
          Loading
        </Loader>
      )}
    </div>
  );
};

export default Chat;
