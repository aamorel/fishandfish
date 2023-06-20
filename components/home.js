import React, { useEffect, useState } from "react";

import {
  friendRequest,
  getCurUser,
  getUserFriends,
  main,
  setUserEmailLocal,
  truncate,
  getImageUrlFromStorage
} from "~utilities";

import Header from "./header";

import "./home.css";

function Home({ setPage }) {
  const [keywordBased, setKeywordBased] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [websites, setWebsites] = useState([]);
  const [friendsPannel, setFriendsPannel] = useState(false);
  const [friendsEmails, setFriendsEmails] = useState([]);
  const [friendsRequests, setFriendsRequests] = useState([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [bookmarkToEmail, setBookmarkToEmail] = useState({});
  const [friendToImage, setFriendToImage] = useState({});

  const getWebsites = async () => {
    const websitesAndBookmarkToEmailMappings = await main();
    const websites = [websitesAndBookmarkToEmailMappings[0], websitesAndBookmarkToEmailMappings[1]];
    const mappings = websitesAndBookmarkToEmailMappings[2];
    if (websites) {
      setWebsites(websites);
      setWaiting(false);
      setBookmarkToEmail(mappings);
      console.log(mappings);
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    getWebsites();
  }, []);

  useEffect(() => {
    const getFriends = async () => {
      const curUser = await getCurUser();
      setCurrentUserEmail(curUser.data["userEmail"]);
      const friends = await getUserFriends(
        "getFriends",
        curUser.data["userEmail"]
      );
      const requests = await getUserFriends(
        "getFriendRequests",
        curUser.data["userEmail"]
      );
      setFriendsRequests(requests);
      setFriendsEmails(friends);
      const getImageUrl = async (email) => {
        const url = await getImageUrlFromStorage(email);
        setImageUrl(url);
      };
      const friendImages = {};
      await friends.map(async (friend) => {
        console.log("Friend" + friend);
        const url = await getImageUrlFromStorage(friend);
        friendImages[friend] = url;
      });
      setFriendToImage(friendImages);
      getImageUrl(curUser.data["userEmail"]);
    };
    getFriends();
  }, []);

  const refreshFriends = async () => {
    const friends = await getUserFriends("getFriends", currentUserEmail);
    const requests = await getUserFriends(
      "getFriendRequests",
      currentUserEmail
    );
    setFriendsRequests(requests);
    setFriendsEmails(friends);
  };

  const determineColor = (percentageSimilarity) => {
    if (percentageSimilarity >= 70) {
      return "#01CB09"; //green
    }
    if (percentageSimilarity >= 45) {
      return "#F48620"; //orange
    }
    return "#F4206D"; //red
  };

  return (
    <div>
      <Header />
      {!friendsPannel ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <button className="button" onClick={() => setFriendsPannel(true)}>
                Friends
              </button>
            </div>
            <div>
              <button
                className="button"
                onClick={() =>
                  setKeywordBased((prev) => {
                    if (prev === 0) {
                      return 1;
                    } else {
                      return 0;
                    }
                  })
                }>
                {keywordBased ? "Keyword" : "Semantic"}
              </button>
              <button
                className="buttonSecondary"
                onClick={() => {
                  setUserEmailLocal();
                  setPage("login");
                }}>
                Logout
              </button>
            </div>
          </div>
          <h3>
            Easily find previous bookmarks related to your current website
          </h3>
          {imageUrl && <img src={imageUrl} style={{width: 50 + 'px', height: 50 + 'px'}}/>}
          {waiting ? (
            <div>
              {error ? (
                <p>
                  Error
                  <button
                    className="buttonSecondary"
                    style={{ marginLeft: 10 }}
                    onClick={() => {
                      getWebsites();
                      setError(false);
                    }}>
                    Retry
                  </button>
                </p>
              ) : (
                <p>Please wait...</p>
              )}
            </div>
          ) : (
            <div className="scroll">
              {websites[keywordBased].map((website) => {
                const curBarColor = determineColor(
                  Math.round(website[1] * 100)
                );
                return (
                  <div
                    className="outer-rectangle"
                    key={website[0] + keywordBased}>
                    <div
                      className="inner-rectangle"
                      style={{
                        backgroundColor: curBarColor,
                        width: `${Math.round(website[1] * 100)}%`,
                        textAlign: "left",
                      }}>
                      <u>
                        <a
                          style={{
                            color: "rgb(85, 61, 159)",
                            textAlign: "left",
                          }}
                          href={website[0]}
                          target="_blank">
                          {truncate(website[0], 40)}
                        </a>
                      </u>
                    </div>
                    <p
                      style={{
                        position: "absolute",
                        marginRight: 20,
                        right: 20,
                        top: -5,
                        color: "rgb(142, 105, 255)",
                        fontWeight: "bold",
                      }}>
                      {Math.round(website[1] * 100)}%
                    </p>
                    <img
                      style={{
                        position: "absolute",
                        marginRight: 10,
                        right: 0,
                        top: 5,
                        borderRadius: "50%"
                      }}
                      src={bookmarkToEmail[website[0]][0].constructor == Object ? imageUrl : friendToImage[bookmarkToEmail[website[0]][0]]}
                      width="20px"
                      height="20px"
                      />
                      
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            className="buttonSecondary"
            onClick={() => setFriendsPannel(false)}>
            Back
          </button>
          <h3>Add a friend</h3>
          <div className="grid-container">
            <div style={{ display: "flex" }}>
              <input
                autoComplete="off"
                type="text"
                id="friendEmail"
                style={{ width: 250 }}
                required
                placeholder="Friend's email"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
              />

              <button
                style={{ marginLeft: 10 }}
                className="button"
                onClick={() => {
                  friendRequest(
                    "makeFriendRequest",
                    currentUserEmail,
                    requestEmail
                  );
                  setRequestEmail("");
                }}>
                Submit
              </button>
            </div>
          </div>
          <div className="scroll2">
            <h3>My friends:</h3>
            <div>
              {friendsEmails.length === 0 ? (
                <p style={{ color: "rgb(100, 100, 100" }}>No friends</p>
              ) : (
                friendsEmails.map((friend) => {
                  //fix the scrolling
                  return (
                    <div
                      key={friend}
                      style={{
                        width: 200,
                      }}>
                      <p
                        style={{
                          padding: 5,
                          borderRadius: 5,
                          backgroundColor: "rgb(142, 105, 255)",
                          color: "white",
                          paddingLeft: 10,
                          border: "2px solid rgb(85, 61, 159)",
                        }}>
                        {friend}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
            <h3>Friend requests:</h3>
            <div>
              {friendsRequests.length === 0 ? (
                <p style={{ color: "rgb(100, 100, 100" }}>No friend requests</p>
              ) : (
                friendsRequests.map((friend) => {
                  console.log("Friend :", friend);
                  return (
                    <div key={friend} style={{ display: "flex" }}>
                      <p>{friend}</p>
                      <button
                        style={{ marginLeft: 10 }}
                        className="button"
                        onClick={() => {
                          friendRequest(
                            "acceptFriendRequest",
                            currentUserEmail,
                            friend
                          );
                          //use the firestore listener instead
                          // Dirty, ideally should be done with a listener
                          setTimeout(() => {
                            refreshFriends();
                          }, 1000);
                        }}>
                        Accept
                      </button>
                      <button
                        style={{ marginLeft: 10 }}
                        className="buttonSecondary"
                        onClick={() => {
                          friendRequest(
                            "declineFriendRequest",
                            currentUserEmail,
                            friend
                          );
                          // Dirty, ideally should be done with a listener
                          setTimeout(() => {
                            refreshFriends();
                          }, 1000);
                        }}>
                        Deny
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
