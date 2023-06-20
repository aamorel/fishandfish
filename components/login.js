import { ref, uploadBytesResumable } from "firebase/storage";
import React, { useState } from "react";

import { storage, try_create_account, try_login } from "~utilities";

import Header from "./header";

function Login({ setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logingIn, setLoggingIn] = useState(true);
  const [creatingAccountEmail, setCreatingAccountEmail] = useState("");
  const [creatingAccountPassword, setCreatingAccountPassword] = useState("");
  const [creatingAccountName, setCreatingAccountName] = useState("");
  const [photo, setProfilePhoto] = useState("");

  // Handle file upload event and update state
  function handleChange(event) {
    setProfilePhoto(event.target.files[0]);
  }

  const handleUpload = (userEmail) => {
    const storageRef = ref(storage, `/files/${userEmail}.jpg`);

    const uploadTask = uploadBytesResumable(storageRef, photo);
  };

  const login = async () => {
    console.log("Logging in... ");
    const userEmail = await try_login(email, password);
    console.log("User email: ", userEmail);
    if (userEmail.includes("@")) {
      setPage("home");
    }
  };

  return (
    <div id="login">
      <Header />
      {logingIn ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <h2>Email: </h2>
          <input
            type="text"
            autoComplete="off"
            id="login_email"
            style={{ width: 250 }}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <h2>Password: </h2>
          <input
            type="password"
            autoComplete="off"
            id="login_password"
            minLength="8"
            required
            value={password}
            style={{ width: 250 }}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div
            style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
            <button
              className="button"
              onClick={login}
              style={{ marginBottom: 10 }}>
              Login
            </button>
            <button
              className="buttonSecondary"
              onClick={() => setLoggingIn(false)}>
              Create account
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <h2>Full Name: </h2>
          <input
            type="text"
            autoComplete="off"
            style={{ width: 250 }}
            required
            value={creatingAccountName}
            onChange={(e) => setCreatingAccountName(e.target.value)}
          />
          <h2>Email: </h2>
          <input
            autoComplete="off"
            type="text"
            style={{ width: 250 }}
            required
            value={creatingAccountEmail}
            onChange={(e) => setCreatingAccountEmail(e.target.value)}
          />
          <h2>Password: </h2>
          <input
            autoComplete="off"
            type="password"
            id="create_password"
            minLength="8"
            required
            style={{ width: 250 }}
            value={creatingAccountPassword}
            onChange={(e) => setCreatingAccountPassword(e.target.value)}
          />
          <div>
            <h2>Profile Picture: </h2>
            <input type="file" accept="image/*" onChange={handleChange} />
            {/* <button onClick={() => handleUpload(creatingAccountEmail)}>Profile Picture Upload</button> */}
          </div>
          <div
            style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
            <button
              className="button"
              onClick={async () => {
                console.log(photo);
                if (photo) {
                  console.log("have photo");
                  const res = await try_create_account(
                    creatingAccountName,
                    creatingAccountEmail,
                    creatingAccountPassword
                  );
                  console.log(res);
                  if (res.includes("@")) {
                    console.log("here");
                    setPage("home");
                    handleUpload(creatingAccountEmail);
                  } else {
                    console.log("why????");
                  }
                }
              }}
              style={{ marginBottom: 10 }}>
              Create
            </button>
            <button
              className="buttonSecondary"
              onClick={() => setLoggingIn(true)}>
              Login instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
