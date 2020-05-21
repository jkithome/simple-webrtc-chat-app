import React, { Fragment, useState, useEffect, useRef } from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Button,
  Loader,
  Form,
  Label
} from "semantic-ui-react";
import SweetAlert from "react-bootstrap-sweetalert";
import { format } from "date-fns";
import "./App.css";
import UsersList from "./UsersList";
import MessageBox from "./MessageBox";
import Paho from "paho-mqtt"
import MonetizationOff from './MonetizationOff'

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
  const [me, setMe] = useState("");
  const [paymentPointer, setPaymentPointer] = useState("");
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

// Called when a message arrives on mqtt topic
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
          break
        case "login":
          // we sent the login message
          if (data.name === me) onLogin(data)
          else {
            // someone else logged in. add to our list of users
            updateUsersList(data.users[0])
            // broadcast ourselves so that new user sees us
            if (me) {
              send({ type: "updateUsers",
                key: me,
                userName: me,
                pointer: paymentPointer
              })
            }
          }
          break
        case "updateUsers":
          updateUsersList(data);
          break
        case "removeUser":
          removeUser(data)
          break
        case "offer":
          onOffer(data)
          break
        case "answer":
          if (!data.sender) {
            console.error('INVALID answer message')
          } else {
            onAnswer(data)
          }
          break
        case "candidate":
          onCandidate(data);
          break
        case "channelMessage":
          onChannelMessage(data);
          break
        default:
          console.log(`${data.type} type not handled in switch`)
          console.log(data)
          break
      }
    }
  }, [socketMessages]);

  const closeAlert = () => {
    setAlert(null);
  };

  const send = data => {
    //webSocket.current.send(JSON.stringify(data));
    console.log('sending')
    console.log(data)
    client.current.publish("demo",JSON.stringify(data))
  }

  //was { data }
  const onChannelMessage = (data) => {
    handleDataChannelMessageReceived(data)
  }

  const handleLogin = () => {
    setLoggingIn(true);
    // todo: broker should do login
    // for now, in demo mode
    // users should be array of logged in users
    // back end will need to maintain
    send({ type: "login",
      name: me,
      success: true,
      message:"I just logged in",
      users: [{key:me, userName: me, pointer: paymentPointer}]
    });
  };

  // was { user }
  const updateUsersList = (user) => {
    removeUser(user)
    user.avatar = `https://avatars.dicebear.com/api/human/${user.userName}.svg`
    setUsers(prev => [...prev, user]);
  };

  //was { user }
  const removeUser = (user) => {
    setUsers(prev => prev.filter(u => u.userName !== user.userName));
  }

  //message received from user in channel
  //TODO: refactor messages model
  // really should be conversations[sender]/messages
  const handleDataChannelMessageReceived = (data) => {
    //todo: group messages are also sent here
    if (!(data.recipient === me || data.sender === me)) return
    const message = data //JSON.parse(data);
    //const { name: user } = message
    const sender = message.sender
    const recipient = message.recipient
    const peer = (sender === me) ? recipient : sender
    // list of conversations we have had
    let conversations = messagesRef.current
    let peerMessages = conversations[peer]
    if (peerMessages) {
      //load previous conversation with our peer
      console.log("previous convo")
      peerMessages = [...peerMessages, message]
      let newMessages = Object.assign({}, messages, { [peer]: peerMessages })
      messagesRef.current = newMessages
      setMessages(newMessages)
      console.log(newMessages)
    } else {
      // start a new conversation with peer
      console.log("new convo")
      peerMessages = { [peer]: [message] }
      let newMessages = Object.assign({}, messages, peerMessages)
      messagesRef.current = newMessages
      setMessages(newMessages)
      console.log(newMessages)
    }
  }

  const onLogin = ({ success, message, users: loggedIn }) => {
    setLoggingIn(false)
    if (success) {
      setAlert(
        <SweetAlert
          success
          title={`Hello ${me}`}
          timeout={3000}
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          Logged in successfully!
        </SweetAlert>
      )
      setIsLoggedIn(true)
      updateUsersList(loggedIn[0])

      //setup connection to peer
      //for now this is required. try to replace
      //can we pass webrtc message over mqtt???
      let localConnection = new RTCPeerConnection(configuration);
      //when the browser finds an ice candidate we send it to another peer
      // localConnection.onicecandidate = ({ candidate }) => {
      //   let connectedTo = connectedRef.current;

      //   if (candidate && !!connectedTo) {
      //     send({
      //       name: connectedTo,
      //       type: "candidate",
      //       candidate
      //     });
      //   }
      // };
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

  //when somebody wants to connect to us
  // was { offer, name }
  const onOffer = (offerMessage) => {
    if (offerMessage.peer !== me) return
    setConnectedTo(offerMessage.sender);
    connectedRef.current = offerMessage.sender;

    // connection
    //   .setRemoteDescription(new RTCSessionDescription(offer))
    //   .then(() => connection.createAnswer())
    //   //erroring, not sure what it does
    //   //.then(answer => connection.setLocalDescription(answer))
    //   .then(() =>
        // send answer from us to offer sender
        send({ type: "answer", 
          answer: connection.localDescription, 
          sender: me, 
          peer: offerMessage.sender 
        })
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

  //when a peer answers our offer
  // was { answer }
  const onAnswer = (answer) => {
    if (answer.sender !== me) return
    console.log(`thanks for accepting. you are now connected to ${answer.peer}`)
    //connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  //when we got ice candidate from another user
  const onCandidate = ({ candidate }) => {
    console.log('we dont do ice candidates')
    //connection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  //when a user clicks the send message button
  const sendMsg = () => {
    const time = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
    //let messages = messagesRef.current
    let connectedTo = connectedRef.current
    let messageEntity = { type:"channelMessage", time, message, 
      sender: me, recipient: connectedTo || "group" }
    //let userMessages = messages[connectedTo]
    // if (messages[connectedTo]) {
    //   userMessages = [...userMessages, text]
    //   let newMessages = Object.assign({}, messages, {
    //     [connectedTo]: userMessages
    //   });
    //   messagesRef.current = newMessages;
    //   setMessages(newMessages)
    // } else {
    //   userMessages = Object.assign({}, messages, { [connectedTo]: [text] });
    //   messagesRef.current = userMessages
    //   setMessages(userMessages)
    // }
    //just send it to group, ui will filter out messages
    // not intended for recipient
    send(messageEntity)
    setMessage("")
  };

  //connect to a peer with offer
  //we are sender, peer is person we are trying to connect to
  const handleConnectToPeer = peer => {
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
        send({ type: "offer", offer: connection.localDescription, sender: me, peer })
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
      )
  }

  const toggleConnectToPeer = userName => {
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
      handleConnectToPeer(userName);
      setConnecting(false);
    }
  };

  return (
    <div className="App">
      {alert}
      <Header as="h2" icon>
        <Icon name="users" />
        <a href="https://webmonetization.org/docs/getting-started.html" target="_blank" rel="noopener noreferrer">Web Monetization</a> Chat
      </Header>
      <MonetizationOff/>
      {(socketOpen && (
        <Fragment>
          <Grid centered columns={2}>
            <Grid.Column>
              {(!isLoggedIn && (
                <>
                <Form>
                <Form.Field>
                <Label pointing="below">Username is your chat alias (authentication not enabled yet)</Label>
                <Input icon='user' iconPosition='left'
                  disabled={loggingIn}
                  type="text"
                  onChange={e => setMe(e.target.value)}
                  placeholder="Username..."
                  action
                  autoFocus
                >
                </Input>
                </Form.Field>
                <Form.Field>
                <Label pointing="below"><a href="https://paymentpointers.org/" target="_blank" rel="noopener noreferrer">Payment Pointer</a> is your (optional) wallet address where you get paid when you chat</Label>
                <Input icon='dollar' iconPosition='left'
                  disabled={loggingIn}
                  type="text"
                  onChange={e => setPaymentPointer(e.target.value)}
                  placeholder="Payment Pointer"
                  action
                >
                </Input>
                </Form.Field>
                <Button
                    color="teal"
                    disabled={!me || loggingIn}
                    onClick={handleLogin}
                  >
                    <Icon name="sign-in" />
                    Login
                  </Button>
                </Form>
                </>
              )) || (
                <Segment raised textAlign="center" color="olive">
                  Logged In as: {me} {paymentPointer}
                </Segment>
              )}
            </Grid.Column>
          </Grid>
          <Grid>
            <UsersList
              users={users}
              toggleConnection={toggleConnectToPeer}
              connectedTo={connectedTo}
              connection={connecting}
            />
            <MessageBox
              messages={messages}
              connectedTo={connectedTo}
              message={message}
              setMessage={setMessage}
              sendMsg={sendMsg}
              me={me}
            />
          </Grid>
        </Fragment>
      )) || (
        <Loader size="massive" active inline="centered">
          Connecting to messaging service...
        </Loader>
      )}
    </div>
  );
};

export default Chat;
