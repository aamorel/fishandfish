import icon from "data-base64:~assets/icon.svg";

const Header = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}>
      <img src={icon} style={{ width: 80 }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
        <h1>Fish and fish</h1>
        <h2 style={{ color: "rgb(85, 61, 159)", marginTop: 0 }}>curation</h2>
      </div>
    </div>
  );
};

export default Header;
