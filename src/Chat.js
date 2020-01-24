import React, { useState, useEffect, useRef } from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Card,
  List,
  Sticky,
  Button,
  Image,
  Comment
} from "semantic-ui-react";
import "./App.css";
import avatar from "./avatar.png";
import SweetAlert from "react-bootstrap-sweetalert";
import { format, formatRelative } from "date-fns";


const configuration = {
  iceServers: [{ url: "stun:stun.1.google.com:19302" }]
};

const Chat = ({ connection, updateConnection, channel, updateChannel }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [connectedTo, setConnectedTo] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [alert, setAlert] = useState(null);
  const connectedRef = useRef();
  const wsRef = useRef();
  const [message, setMessage] = useState("");
  const messagesRef = useRef({});
  const [messages, setMessages] = useState({});

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:9000");

    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "login":
          onLogin(data);
          break;
        case "updateUsers": {
          updateUsersList(data);
          break;
        }
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
          break;
      }
    };
    ws.onclose = () => {
      ws.close();
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  const updateSocket = () => {
    wsRef.current.onmessage = event => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "login":
          onLogin(data);
          break;
        case "updateUsers": {
          updateUsersList(data);
          break;
        }
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
          break;
      }
    };
  }

  useEffect(() => {
    if(connection) {
      openDataChannel();
    }
  }, [connection])

  const closeAlert = () => {
    setAlert(null);
  };

  const send = data => {
    wsRef.current.send(JSON.stringify(data));
  };

  const handleLogin = () => {
    setLoggingIn(true);
    send({
      type: "login",
      name
    });
  };

  const updateUsersList = ({ users: loggedIn }) => {
    setUsers(loggedIn);
  };

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
        let receiveChannel = event.channel;
        receiveChannel.onmessage = handleDataChannelMessageReceived;
      };
      updateConnection(localConnection);
      updateSocket();
      // openDataChannel();
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

  const openDataChannel = () => {
    var dataChannelOptions = {
      reliable: true
    };

    let dataChannel = connection.createDataChannel(
      "myDataChannel",
      dataChannelOptions
    );

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
    updateSocket();
  };

  //when somebody wants to message us
  const onOffer = ({ offer, name }) => {
    setConnectedTo(name);
    connectedRef.current = name;
    connection.setRemoteDescription(new RTCSessionDescription(offer));

    connection.createAnswer(
      answer => {
        connection.setLocalDescription(answer);
        send({
          type: "answer",
          answer: answer,
          name
        });
      },
      function(error) {
        alert("oops...error");
      }
    );
  };

  //when another user answers to our offer
  const onAnswer = ({ answer }) => {
    connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  //when we got ice candidate from another user
  const onCandidate = ({ candidate }) => {
    connection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  //when a user clicks the send message button
  const sendMsg = () => {
    const time = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    let text = { time, message, name };
    let messages = messagesRef.current;
    let connectedTo = connectedRef.current
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
    channel.send(JSON.stringify(text));
    setMessage("");
  };

  const handleConnection = name => {
    connection.createOffer(
      offer => {
        send({
          type: "offer",
          offer: offer,
          name
        });

        connection.setLocalDescription(offer);
      },
      error => {
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
      }
    );
  };

  const toggleConnection = userName => {
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
        Simple WebRTC Chap App
      </Header>
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
        <Grid.Column width={5}>
          <Card fluid>
            <Card.Content header="Online Users" />
            <Card.Content textAlign="left">
              {(users.length && (
                <List divided verticalAlign="middle" size="large">
                  {users.map(({ userName }) => (
                    <List.Item key={userName}>
                      <List.Content floated="right">
                        <Button
                          onClick={() => {
                            toggleConnection(userName);
                          }}
                          disabled={!!connectedTo && connectedTo !== userName}
                          loading={connectedTo === userName && connecting}
                        >
                          {connectedTo === userName ? "Disconnect" : "Connect"}
                        </Button>
                      </List.Content>
                      <Image avatar src={avatar} />
                      {/* <Icon name="user" size="large" /> */}
                      <List.Content>
                        <List.Header>{userName}</List.Header>
                      </List.Content>
                    </List.Item>
                  ))}
                </List>
              )) || <Segment>There are no users Online</Segment>}
            </Card.Content>
          </Card>
        </Grid.Column>
        <Grid.Column width={11}>
          <Sticky>
            <Card fluid>
              <Card.Content
                header={
                  !!connectedTo
                    ? connectedTo
                    : "Not chatting with anyone currently"
                }
              />
              <Card.Content>
                {!!connectedTo && messages[connectedTo] ? (
                  <Comment.Group>
                    {messages[connectedTo].map(
                      ({ name, message: text, time }) => (
                        <Comment key={`msg-${name}-${time}`}>
                          <Comment.Avatar src={avatar} />
                          <Comment.Content>
                            <Comment.Author>{name}</Comment.Author>
                            <Comment.Metadata>
                              <span>
                                {formatRelative(new Date(time), new Date())}
                              </span>
                            </Comment.Metadata>
                            <Comment.Text>{text}</Comment.Text>
                          </Comment.Content>
                        </Comment>
                      )
                    )}
                  </Comment.Group>
                ) : (
                  <Segment placeholder>
                    <Header icon>
                      <Icon name="discussions" />
                      No messages available yet
                    </Header>
                  </Segment>
                )}
                <Input
                  fluid
                  type="text"
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type message"
                  action
                >
                  <input />
                  <Button color="teal" disabled={!message} onClick={sendMsg}>
                    <Icon name="send" />
                    Send Message
                  </Button>
                </Input>
              </Card.Content>
            </Card>
          </Sticky>
        </Grid.Column>
      </Grid>
    </div>
  );
};

export default Chat;