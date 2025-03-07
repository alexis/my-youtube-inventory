# My YouTube Inventory

This is a small Node.js project that allows you to fetch data about the videos in your YouTube
playlists and export the information to a CSV file.

I created it to have a reliable way to look through the videos I've added to my YouTube playlists.
The setup process involves configuring a Google Cloud Project, enabling the YouTube Data API, and
setting up OAuth 2.0 credentials. Kind of complicated, but Google APIs aren't particularly optimized
for personal use cases, and hey, at least it works `¯\_(ツ)_/¯`.

## Installation

1. Clone the repository:
   ```shell
   git clone https://github.com/alexis/my-youtube-inventory
   cd my-youtube-inventory
   ```
2. Install the dependencies:
   ```shell
   npm install
   ```
3. Get your Client ID and Client Secret from Google Cloud Project:

- Create a new Project on Google Cloud Platform (https://console.developers.google.com/project)
- Enable YouTube Data API (https://console.cloud.google.com/apis/library/youtube.googleapis.com)
- Create OAuth 2.0 credentials (https://console.cloud.google.com/apis/credentials), make sure to
  choose `Desktop app` as "Application type"
- Create `./.env` file in the project's root directory and use the obtained ID and Secret

  ```shell
  MYTI_OAUTH_CLIENT_ID=<your-client-id>
  MYTI_OAUTH_CLIENT_SECRET=<your-client-secret>
  ```

- Add `https://www.googleapis.com/auth/youtube.readonly` to OAuth scopes
  (https://console.cloud.google.com/auth/scopes)
- Add yourself as a test user (https://console.cloud.google.com/apis/credentials/consent)
- Run `npm start` and follow instructions to authorize in browser. (Note: it will save your YuuTube
  access token locally in `./OAUTH.json`, do this at your own risk)

## Usage

Fetch your personal playlists and store the information in `myti.csv`:

```shell
npx myti
```
