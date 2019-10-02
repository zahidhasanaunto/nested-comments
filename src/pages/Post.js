import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";

import { Heading, Box, Text } from "rebass";
import TimeAgo from "react-timeago";

import { useAuthContext } from "../utils/authContext";
import http from "../utils/http";
import Comment from "../components/Comment";
import Reply from "../components/Reply";
import Error from "../components/Error";
import TextWithEdit from "../components/TextWithEdit";

import LinkButton from "../components/LinkButton";

function PostPage() {
  const { userState } = useAuthContext();
  const history = useHistory();
  let { postId } = useParams();

  const [post, setPost] = useState(null);
  const [error, setError] = useState(false);
  const [isEditing, setEditing] = useState(false);

  useEffect(() => {
    const fetchPost = async postId => {
      try {
        const result = await http("posts/" + postId);
        setPost(result);
      } catch (e) {
        if (e.status === 400 || e.status === 404) history.push("/not-found");
        else setError(true);
      }
    };

    fetchPost(postId);
    // eslint-disable-next-line
  }, [postId]);

  const addComment = async ({ text }) => {
    let result = await http("comments/" + post.id, "POST", {
      parentComment: "",
      text
    });
    result.authorName = userState.user.username;

    const comments = [result, ...post.comments];
    setPost({ ...post, comments: comments });
  };

  const addChildComment = async (parentComment, text) => {
    const comments = post.comments.slice();
    const index = comments.findIndex(com => com.id === parentComment.id);

    let result = await http("comments/" + post.id, "POST", {
      parentComment,
      text
    });
    result.authorName = userState.user.username;

    comments.splice(index + 1, 0, result);
    setPost({ ...post, comments: comments });

    return true;
  };

  const hideChildComments = comment => {
    const comments = post.comments.slice();
    const index = comments.findIndex(com => com.id === comment.id);

    if (!comment.hideContent) {
      comments[index].childrenCount = 0;
      comments[index].hideContent = true;
      for (let i = index + 1; i < comments.length; i++) {
        if (
          comments[i].path[0] === comment.path[0] &&
          comments[i].depth > comment.depth
        ) {
          comments[i].hide = true;
          if (!comments[i].hiddenBy) {
            comments[i].hiddenBy = comment.id;
          }
          comments[index].childrenCount += 1;
        } else break;
      }
    } else {
      comments[index].hideContent = false;
      for (let i = index + 1; i < comments.length; i++) {
        if (
          comments[i].path[0] === comment.path[0] &&
          comments[i].depth > comment.depth
        ) {
          if (comments[i].hiddenBy === comment.id) {
            comments[i].hide = false;
            comments[i].hiddenBy = undefined;
          }
        } else break;
      }
    }

    setPost({ ...post, comments: comments });
  };

  const editPost = async formData => {
    const result = await http("posts/" + postId, "PUT", formData);
    setPost({ ...post, text: result.text, updatedAt: result.updatedAt });
    setEditing(false);
  };

  if (error) return <Error />;
  if (!post) return "Loading";

  return (
    <>
      <Box my={3}>
        <Heading fontSize={[2, 2, 3]} mb={1} color="secondary">
          {post.title}
        </Heading>
        <Box mb={2}>
          By {post.user.username} <TimeAgo date={post.createdAt} />
          {post.createdAt !== post.updatedAt && (
            <>
              {" | "}
              <Text fontSize="12px" as="span">
                (updated <TimeAgo date={post.updatedAt} />)
              </Text>
            </>
          )}
          {" | "}
          {post.comments.length} comments
          {userState.user.id === post.userId && (
            <LinkButton ml={2} onClick={() => setEditing(true)}>
              edit
            </LinkButton>
          )}
        </Box>
        <TextWithEdit
          isEditing={isEditing}
          onSubmit={editPost}
          text={post.text}
        />
      </Box>

      <Reply handleSubmit={addComment} />
      <hr />

      <Box mb={5}>
        {post.comments &&
          post.comments.map(
            comment =>
              !comment.hide && (
                <Comment
                  comment={comment}
                  key={comment.id}
                  hideChildComments={hideChildComments}
                  addChildComment={addChildComment}
                  userId={userState.user.id}
                />
              )
          )}
      </Box>
    </>
  );
}

export default PostPage;
