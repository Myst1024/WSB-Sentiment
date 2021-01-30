import * as functions from "firebase-functions";
import axios, { AxiosResponse } from "axios";
import Post, { Data } from "./interfaces/Post";

type PartialPost = Partial<Data>;

exports.topPosts = functions.https.onRequest(async (request, response) => {
  const posts: Array<PartialPost> = await getNewPosts();

  //  Get blacklist as array from DB
  //  Get list of tickers as array from DB
  //  iterate on `posts`, split title on non-chars to create `words`
  //    generate sentiment of sqrt(post upvotes)
  //    create empty `stonks` map
  //    iterate on `words` ignoring if exists in `blacklist` or does not exist in `tickers`
  //      if word is in `stonks` map, set value to current plus `sentiment`
  //      else `stongs.set(sentiment`)

  response.send(posts);
});

const getNewPosts = async () => {
  const subredditUrl: string = "https://www.reddit.com/r/wallstreetbets.json";
  const subredditParams = { sort: "top", t: "day", limit: 3 };
  const result = await axios.get(subredditUrl, { params: subredditParams });
  return result.status === 200 ? parseRedditResult(result.data) : [];
};

const parseRedditResult = (result: AxiosResponse) => {
  const posts: Array<Post> = result.data ? result.data.children : [];
  let formattedPosts: Array<PartialPost> = [];
  if (posts.length > 0) {
    //TODO: filter stickied posts if necessary (top sort may do so inherently)
    formattedPosts = posts.map((post: Post) => {
      const data = post.data;
      return {
        id: data.id,
        created_utc: data.created_utc,
        title: data.title,
        ups: data.ups,
      };
    });
  }
  return formattedPosts;
};
