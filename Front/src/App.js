import { useEffect, useRef, useState } from "react";
import "./App.css";
import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_SERVER_URL);
function App() {
  const [user, setUser] = useState({ _id: 0, name: "Test" });

  const [users, setUsers] = useState([]);

  const [botMessage, setBotMessage] = useState("");

  const messageBox = useRef();
  const [usernameInput, setUsernameInput] = useState("");

  const [channels, setChannels] = useState([
    {
      _id: 1,
      name: "test",
      members: [],
      messages: [
        { _id: Math.random(), user: { name: "Yohan" }, content: "Message" }
      ]
    }
  ]);
  const [allChannels, setAllChannels] = useState([
    {
      _id: 1,
      name: "test",
      members: [],
      messages: [
        { _id: Math.random(), user: { name: "Yohan" }, content: "Message" }
      ]
    }
  ]);

  const [message, setMessage] = useState("");
  const [currentChannel, setCurrentChannel] = useState(channels[0]);

  useEffect(() => {
    socket.on("logged", data => {
      setUser(data.user);
      setUsers(data.users);
      setAllChannels(data.channels);
      const activesChannels = data.channels.filter(channel =>
        channel.members.find(member => member._id === data.user._id)
          ? true
          : false
      );
      setChannels(activesChannels);
      setCurrentChannel(activesChannels[0]);
    });

    socket.on("globalResponse", data => {
      setAllChannels(data.channels);
      const activesChannels = data.channels.filter(channel =>
        channel.members.find(member => member._id === user._id) ? true : false
      );
      setUsers(data.users);

      setChannels(activesChannels);

      const current = activesChannels.find(
        channel => channel._id === currentChannel._id
      );
      current
        ? setCurrentChannel(current)
        : setCurrentChannel(activesChannels[0]);
    });

    socket.on("responseChannels", data => {
      setAllChannels(data.channels);
      const dataCurrent = data.currentChannel | undefined;
      const activesChannels = data.channels.filter(channel =>
        channel.members.find(member => member._id === data.user._id)
          ? true
          : false
      );
      setChannels(activesChannels);

      if (!dataCurrent) return setCurrentChannel(activesChannels[0]);

      const current = activesChannels.find(
        channel => channel._id === dataCurrent._id
      );
      current
        ? setCurrentChannel(current)
        : setCurrentChannel(activesChannels[0]);
    });

    socket.on("listChannels", data => {
      let content = "Voici les différents channels: ";
      data.channels.forEach((channel, i) => {
        if (channel.isPrivate) return;
        content += channel.name;
        i === data.channels.length - 1 ? (content += ".") : (content += ", ");
      });
      setBotMessage(content);
    });
    socket.on("listSpecificChannels", data => {
      let content = "Voici les différents channels contenant ce mot: ";
      data.channels.forEach((channel, i) => {
        if (channel.isPrivate) return;

        content += channel.name;
        i === data.channels.length - 1 ? (content += ".") : (content += ", ");
      });
      setBotMessage(content);
    });

    socket.on("usersList", data => {
      let content = "Voici les différents utilisateurs: ";
      data.members.forEach((member, i) => {
        content += member.name;
        i === data.members.length - 1 ? (content += ".") : (content += ", ");
      });
      setBotMessage(content);
    });
  }, [currentChannel]);
  const checkMessage = () => {
    if (message.startsWith("/nick ")) return defineNickname();
    if (message.startsWith("/list")) return list();
    if (
      message.startsWith("/create ") ||
      message.startsWith("/delete ") ||
      message.startsWith("/join ") ||
      message.startsWith("/quit ")
    )
      return checkNameChannel();
    if (message.startsWith("/users")) return listUsers();
    if (message.startsWith("/msg ")) return sendPrivateMessage();
    return sendMessage();
  };

  const checkNameChannel = () => {
    const name = message.split(" ")[1];
    if (!name) return "Erreur";
    if (message.startsWith("/create ")) return createChannel(name);
    if (message.startsWith("/delete ")) return deleteChannel(name);
    if (message.startsWith("/join ")) return joinChannel(name);
    if (message.startsWith("/quit ")) return quitChannel(name);
  };
  const defineNickname = () => {
    const newNickname = message.split(" ")[1];
    socket.emit("changeNickname", { name: newNickname, _id: user._id });
    setMessage("");
  };
  const list = () => {
    const name = message.split(" ")[1];
    socket.emit("list", name);
    setMessage("");
  };
  const createChannel = name => {
    socket.emit("createChannel", { name, _id: user._id });
    setMessage("");
  };
  const deleteChannel = name => {
    socket.emit("deleteChannel", { name });
    setMessage("");
  };
  const joinChannel = name => {
    socket.emit("joinChannel", { name, _id: user._id, currentChannel });
    setMessage("");
  };
  const quitChannel = name => {
    socket.emit("quitChannel", { name, _id: user._id, currentChannel });
    setMessage("");
  };
  const listUsers = () => {
    if (!currentChannel) return;
    socket.emit("listUsers", { channel_id: currentChannel._id });
    setMessage("");
  };

  const sendPrivateMessage = () => {
    const name = message.split(" ")[1];
    socket.emit("sendPrivateMessage", { user, message, name });
    setMessage("");
  };
  const sendMessage = () => {
    if (!currentChannel) return;
    socket.emit("sendMessage", { user, currentChannel, message });
    setMessage("");
  };

  const changeCurrentChannel = id => {
    setCurrentChannel(channels.find(channel => channel._id === id));
    messageBox.current.scrollTop = messageBox.current.scrollTopMax;
  };

  const login = () => {
    socket.emit("login", usernameInput);
  };

  const getPrivateName = name => {
    const id_1 = name.split(" ")[0];
    const id_2 = name.split(" ")[2];
    const name_1 = users.find(user => user._id === id_1).name;
    const name_2 = users.find(user => user._id === id_2).name;
    return `${name_1} - ${name_2}`;
  };

  return (
    <div className="App h-screen">
      <header className="h-10">
        <h1 className="text-3xl">Chat de Prouveurs</h1>
      </header>

      {user._id !== 0 ? (
        <div className="bg-cyan-50 w-3/4 h-3/4  rounded-xl border-black border-8 flex flex-col items-center justify-center ">
          <div className="w-full h-3/4 flex items-center justify-center">
            <div
              ref={messageBox}
              className="bg-cyan-50 h-5/6 w-9/12 rounded-xl border-black rounded-r-none border-8 self-center overflow-y-scroll"
            >
              {currentChannel &&
                currentChannel.messages.length > 0 &&
                currentChannel.messages.map(message => (
                  <div
                    key={message._id}
                    className="flex flex-col justify-start items-start text-base text-black"
                  >
                    <i>{message.user.name} :</i>
                    <span className=" ml-4 ">{message.content}</span>
                  </div>
                ))}
              {currentChannel && currentChannel.messages.length === 0 && (
                <div className="text-black">
                  <i>Pas encore de message de prouveurs</i>
                </div>
              )}
              {!currentChannel && (
                <div className="text-black">
                  <li>
                    <i>/list</i> liste des différents channels
                  </li>
                  <li>
                    <i>/users</i> liste des utilisateurs présents dans le
                    channel
                  </li>
                  <li>
                    <i>/join</i> <i className=" text-orange-400"> name </i>
                    permet de rejoindre un channel
                  </li>
                  <li>
                    <i>/create</i> <i className=" text-orange-400"> name </i>
                    permet de créer un channel
                  </li>
                  <li>
                    <i>/delete</i> <i className=" text-orange-400"> name </i>
                    permet de supprimer un channel
                  </li>
                  <li>
                    <i>/quit</i> <i className=" text-orange-400"> name </i>
                    permet de quitter un channel
                  </li>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-between h-5/6 w-2/12 text-black border-8 rounded-l-none rounded-xl border-l-0 border-black">
              <div className="flex flex-col overflow-y-scroll">
                {channels &&
                  channels.map(channel => {
                    if (channel.isPrivate) {
                      return (
                        <div
                          key={channel._id}
                          className={
                            currentChannel._id === channel._id
                              ? "bg-orange-400 cursor-pointer text-lg"
                              : " cursor-pointer text-lg"
                          }
                          onClick={() => changeCurrentChannel(channel._id)}
                        >
                          {getPrivateName(channel.name)}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={channel._id}
                        className={
                          currentChannel._id === channel._id
                            ? "bg-blue-400 cursor-pointer text-lg"
                            : " cursor-pointer text-lg"
                        }
                        onClick={() => changeCurrentChannel(channel._id)}
                      >
                        {channel.name}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
          <div className="w-4/5 flex items-center justify-center">
            <textarea
              id="chat"
              rows="1"
              className="block mx-4 p-2.5 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => (e.key === "Enter" ? checkMessage() : null)}
            ></textarea>
            <button
              type="submit"
              className="inline-flex justify-center p-2 text-blue-600 rounded-full cursor-pointer hover:bg-blue-100 dark:text-blue-500 dark:hover:bg-gray-600"
              onClick={() => checkMessage()}
            >
              <svg
                aria-hidden="true"
                className="w-6 h-6 rotate-90"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
              </svg>
              <span className="sr-only">Send message</span>
            </button>
          </div>
          {botMessage.length > 0 && (
            <div className="w-4/5 flex items-center justify-center text-black text-base">
              <span>{botMessage}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col justify-center gap-5 items-center">
          <input
            type="text"
            id="first_name"
            className=" mt-5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="John Doe"
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
          />
          <button onClick={() => login()}>Connexion</button>
        </div>
      )}
    </div>
  );
}

export default App;
