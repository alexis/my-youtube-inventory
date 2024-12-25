# My YouTube Inventory

This Node.js project fetches and processes videos from your YouTube playlists and saves the data into a CSV file.

## Prerequisites

1. Node.js (v22+ recommended)
2. A Google Cloud Project with YouTube Data API enabled
3. OAuth 2.0 credentials for the project

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
  - Create a new Project on Google Cload Platform (https://console.developers.google.com/project)
  - Enable YouTube Data API (https://console.cloud.google.com/apis/library/youtube.googleapis.com)
  - Create OAuth 2.0 credentials (https://console.cloud.google.com/apis/credentials),
    make sure to choose "TVs and Limited Input devices" as "Application type"
  - Create `./.env` file in the project's root directory and use the obtained ID and Secret
    ```shell
    MYTI_OAUTH_CLIENT_ID=<your-client-id>
    MYTI_OAUTH_CLIENT_SECRET=<your-client-secret>

    ```
  - Add "https://www.googleapis.com/auth/youtube.readonly" to OAuth scopes (https://www.googleapis.com/auth/youtube.readonly)
  - Add yourself as a test user (https://console.cloud.google.com/apis/credentials/consent)
  - Run `npm start` to authorize the script in the browser and fetch sample data to make sure that everything's working
    (Note: This saves your access token locally in `./OAUTH.json`, so do this at your own risk)

## Usage

```shell
npx myti-collect
```

Fetch the your personal playlists and store the information in `videos.csv`.
