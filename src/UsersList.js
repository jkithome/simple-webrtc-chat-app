// Displays list of users on the left
import React from "react";
import {
  Grid,
  Segment,
  Card,
  List,
  Button,
  Image,
  Modal,
  Header
} from "semantic-ui-react";

const UsersList = ({ users, toggleConnection, connectedTo, connecting }) => {
  const avatar = "https://avatars.dicebear.com/api/human/moneychat.svg"
  return (
    <Grid.Column width={5}>
      <Card fluid>
        <Card.Content header="Online Users" />
        <Card.Content textAlign="left">
          {(users.length && (
            <List divided verticalAlign="middle" size="large">
              {users.map((user) => (
                <List.Item key={user.userName}>
                  <List.Content floated="right">
                    <Button
                      onClick={() => {
                        toggleConnection(user.userName);
                      }}
                      disabled={!!connectedTo && connectedTo !== user.userName}
                      loading={connectedTo === user.userName && connecting}
                    >
                      {connectedTo === user.userName ? "Disconnect" : "Connect"}
                    </Button>
                  </List.Content>
                  <Modal trigger={<Image avatar src={avatar} />}>
    <Modal.Header>A Money Chat User</Modal.Header>
    <Modal.Content image>
      <Image wrapped size='medium' src={avatar} />
      <Modal.Description>
        <Header>{user.userName}</Header>
        <p>
          Payment Pointer: {user.pointer}
        </p>
        <p>
          {JSON.stringify(user,null,2)}
        </p>
      </Modal.Description>
    </Modal.Content>
  </Modal>
                  <List.Content>
                    <List.Header>{user.userName}</List.Header>
                  </List.Content>
                </List.Item>
              ))}
            </List>
          )) || <Segment>There are no users Online</Segment>}
        </Card.Content>
      </Card>
    </Grid.Column>
  );
};

export default UsersList;
