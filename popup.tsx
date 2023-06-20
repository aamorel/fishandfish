// @ts-nocheck

import { useEffect, useState } from "react";

import Home from "./components/Home";
import Login from "./components/Login";
import { getCurUser } from "./utilities";

import "./popup.css";

function IndexPopup() {
  const [page, setPage] = useState("login");

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurUser();
      console.log("User: ", user);
      if (
        user != null &&
        user.data != null &&
        "userEmail" in user.data &&
        user.data["userEmail"] != ""
      ) {
        setPage("home");
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="App">
      <div id="popup">
        {page === "login" && <Login setPage={setPage} />}
        {page === "home" && <Home setPage={setPage} />}
      </div>
    </div>
  );
}

export default IndexPopup;
