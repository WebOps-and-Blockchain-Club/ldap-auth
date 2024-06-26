// import ldap from "ldapjs";
var ldap = require("ldapjs");

const client = ldap.createClient({ url: "ldap://ldap.iitm.ac.in:389" });

const LDAP_ADMIN_USERNAME = "";
const LDAP_ADMIN_PASSWORD = "";

const maindn = "dc=ldap,dc=iitm,dc=ac,dc=in";
const rootdn = `cn=${LDAP_ADMIN_USERNAME},ou=bind,${maindn}`;

const authLDAPUser = (roll, password) => {
  return new Promise((resolve, reject) => {
    client.bind(rootdn, LDAP_ADMIN_PASSWORD, function (err) {
      if (err) return reject(err);

      client.search(
        maindn,
        {
          filter: `(&(uid=${roll}))`,
          // attributes: ["displayName"],
          scope: "sub",
        },
        (err, search) => {
          if (err) return reject(err);

          let found = false;
          search.once("searchEntry", (res) => {
            found = true;
            client.bind(res.dn, password, (err) => {
              if (err) return reject(err);
              console.info("[LDAP Request]", res.json.attributes);

              //   if (!res?.json?.attributes?.[0]?.vals?.[0]) {
              //     console.error("[vals Error]", roll, res.json);
              //     return reject({
              //       name: "RollParseError",
              //       message: "There was an error finding this account.",
              //     });
              //   }
              const user = {
                roll,
                email: roll + "@smail.iitm.ac.in",
                degree: res.dn.match(/ou=(?<degree>[a-z]+)/).groups.degree,
                department: roll.slice(0, 2),
                yearOfStudy: 22 - parseInt(roll.slice(2, 4)),
              };
              return resolve(user);
            });
          });

          search.once("end", () => {
            if (!found)
              return reject({
                name: "DoesNotExistError",
                message: "The roll number doesn't exist",
              });
          });
        }
      );
    });
  });
};

const searchLDAPUser = (searchStr) => {
  return new Promise((resolve, reject) => {
    client.bind(rootdn, LDAP_ADMIN_PASSWORD, function (err) {
      if (err) return reject(err);

      client.search(
        `ou=student,${maindn}`,
        {
          filter: `(|(uid=*${searchStr}*)(displayName=*${searchStr}*))`,
          scope: "sub",
          paged: true,
          sizeLimit: 100,
        },
        (err, res) => {
          if (err) return reject(err);

          let users = [];

          res.on("searchRequest", (searchRequest) => {
            console.log("searchRequest: ", searchRequest.messageID);
          });

          res.on("searchEntry", (entry) => {
            console.log("entry: " + JSON.stringify(entry.object));
            users.push(entry.object);
          });

          res.on("searchReference", (referral) => {
            console.log("referral: " + referral.uris.join());
          });

          res.on("error", (err) => {
            console.error("error: " + err.message);
            return reject(err);
          });

          res.on("end", (result) => {
            console.log("status: " + result?.status);
            return resolve(users);
          });
        }
      );
    });
  });
};

authLDAPUser("", "")
  .then((a) => console.log(true))
  .catch(console.error);

searchLDAPUser("")
  .then(() => console.log(true))
  .catch(console.error);
