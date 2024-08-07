import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import Loading from '@/components/loading';
import { ForumDetailsModal } from '@/components/forumDetailsModal';

import { BACKEND_URL, COLORS } from '@/settings';
import { createInferences } from '@/helpers/utils';

import classes from './styles.module.css';

export default function Assignment() {
    const [searchParams, _] = useSearchParams();

    const grades = useRef({} as any);
    const selected = useRef({} as any);

    const [loading, updateLoadingState] = useState(false);

    const [posts, updatePosts] = useState([]);
    const [forumName, updateForumName] = useState('');
    const [inferences, updateInferences] = useState(null as any);

    const [questionFilter, updateFilter] = useState(-1);
    const [postFilter, updateFilteredPosts] = useState([] as any);
    const [isFiltering, updateFilterStatus] = useState(false);
    const [filterObj, updateFilterObj] = useState({} as any);

    const [updateQuestion, updateQuestionState] = useState(false);

    const newQuestion = useRef(null as any);

    const [newInferences, updateInference] = useState({} as any);

    useEffect(() => {
        updateLoadingState(true);

        (async function () {
            try {
                const postRes = await fetch(
                    `${BACKEND_URL}/forums/?forum_id=${searchParams.get(
                        'forumId'
                    )}`
                );

                if (!postRes.ok)
                    throw new Error('Error occurred while fetching posts');

                const postJson = await postRes.json();

                const inferenceRes = await fetch(
                    `${BACKEND_URL}/foruminference/?forum_id=${searchParams.get(
                        'forumId'
                    )}`
                );

                if (!inferenceRes.ok)
                    throw new Error(
                        'Error occurred while fetching inferences for post'
                    );

                const inferencesJson = await inferenceRes.json();

                updateForumName(postJson.data.name);
                updatePosts(postJson.data.posts);
                updateInferences(inferencesJson.data);
            }
            catch (error) {
                alert((error as Error).message);
            }
            finally {
                updateLoadingState(false);
            }
        })();
    }, []);

    function filterQ(qIndex: number) {
        if (qIndex === -1) return;

        updateFilter(qIndex);
    }

    function filterBySimilarity(
        postInd: number,
        qIndex: number,
        similarity: number
    ) {
        updateLoadingState(true);

        (async function () {
            try {
                const relationRes = await fetch(
                    `${BACKEND_URL}/postrelations/`,
                    {
                        method: 'POST',
                        cache: 'no-cache',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        redirect: 'follow',
                        referrerPolicy: 'no-referrer',
                        body: JSON.stringify({
                            question: inferences.questions[qIndex],
                            // eslint-disable-next-line camelcase
                            forum_id: searchParams.get('forumId'),
                            // eslint-disable-next-line camelcase
                            post_id: postInd,
                            similarity: similarity,
                        }),
                    }
                );

                const relationJson = await relationRes.json();

                const filteredPostIds = Object.keys(relationJson.data);

                updateFilteredPosts([...filteredPostIds]);
                updateFilter(qIndex);
            }
            catch (error) {
                alert((error as Error).message);
            }
            finally {
                updateLoadingState(false);
            }
        })();
    }

    function masterFilter(filterSimilarity: boolean, similarity: number = 0) {
        updateFilterStatus(false);

        if (filterSimilarity)
            filterBySimilarity(filterObj.postId, filterObj.qIndex, similarity);
        else filterQ(filterObj.qIndex);
    }

    function updateQuestionsMaster(index: number) {
        const selectedPosts = Object.keys(selected.current).filter(
            (postId) => selected.current[postId].checked
        );

        if (selectedPosts.length === 0)
            return alert(
                'No posts to check against. Please select at least one post.'
            );

        updateQuestionState(true);
        updateFilter(index);
        updateFilteredPosts(selectedPosts);
    }

    function testNewQuestion() {
        updateLoadingState(true);

        try {
            (async function () {
                const updateQuestionPosts = Object.keys(
                    selected.current
                ).filter((k) => selected.current[k]);

                const newRes = await fetch(
                    `${BACKEND_URL}/questioninference/`,
                    {
                        method: 'POST',
                        cache: 'no-cache',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        redirect: 'follow',
                        referrerPolicy: 'no-referrer',
                        body: JSON.stringify({
                            question: newQuestion.current.value,
                            // eslint-disable-next-line camelcase
                            forum_id: searchParams.get('forumId'),
                            // eslint-disable-next-line camelcase
                            post_ids: JSON.stringify(updateQuestionPosts),
                        }),
                    }
                );

                const newJson = await newRes.json();

                // eslint-disable-next-line no-console
                console.log(
                    newJson.data.inferences,
                    JSON.stringify(updateQuestionPosts)
                );

                updateInference(newJson.data.inferences);
            })();
        }
        catch (error) {
            alert((error as Error).message);
        }
        finally {
            updateLoadingState(false);
        }
    }

    function finalizeGrades() {
        const jsonGrades = JSON.stringify(
            posts.map((e: any) => {
                return {
                    [e.id]: grades.current[e.id].map((v: any) =>
                        Number(v.value)
                    ),
                };
            })
        );

        const a = window.document.createElement('a');

        a.href = window.URL.createObjectURL(
            new Blob([jsonGrades], { type: 'application/json' })
        );
        a.download = `${forumName}-grades.json`;

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
    }

    function saveNewQuestions() {
        updateLoadingState(true);

        try {
            (async function () {
                const res = await fetch(`${BACKEND_URL}/deleteinferences/`, {
                    method: 'POST',
                    cache: 'no-cache',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    redirect: 'follow',
                    referrerPolicy: 'no-referrer',
                    body: JSON.stringify({
                        // eslint-disable-next-line camelcase
                        forum_id: searchParams.get('forumId'),
                    }),
                });

                if (!res.ok)
                    throw new Error(
                        'An error occurred while deleting inferences'
                    );

                const cleanedQuestions = [...inferences.questions];

                cleanedQuestions[questionFilter] = newQuestion;

                const inferencesRes = await createInferences(
                    searchParams.get('forumId') as string,
                    cleanedQuestions
                );

                if (!inferencesRes.ok)
                    throw new Error('Error occurred while creating inferences');
                else window.location.reload();
            })();
        }
 catch (error) {
            alert((error as Error).message);
        }
 finally {
            updateLoadingState(false);
        }
    }

    if (loading) return <Loading />;
    else if (isFiltering)
        return (
            <ForumDetailsModal
                forumName={ filterObj.forumName }
                question={ filterObj.question }
                filter={ masterFilter }
                close={ () => updateFilterStatus(false) }
            />
        );

    return (
        <div className="forum-details-container">
            <h1>{ forumName }</h1>

            <button
                onClick={ () => {
                    updateFilter(-1);
                    updateFilteredPosts([]);
                    updateQuestionState(false);
                    updateInference({});
                } }
                className="styled-button-dark"
            >
                Reset filters
            </button>

            <button
                className="grade-button styled-button-dark"
                onClick={ finalizeGrades }
            >
                Download Grades
            </button>

            { updateQuestion ? (
                <div>
                    <input
                        className="update-question-input"
                        placeholder="Question"
                        type="text"
                        ref={ newQuestion }
                    />
                    <button
                        className="styled-button-dark"
                        onClick={ testNewQuestion }
                    >
                        Test
                    </button>
                    <button
                        className="styled-button-dark"
                        onClick={ saveNewQuestions }
                    >
                        Save
                    </button>
                </div>
            ) : null }

            { inferences
                ? inferences.questions.map((q: string, index: number) => (
                      <h4
                          style={ { color: COLORS[index] } }
                          key={ index }
                          onClick={ () => {
                              if (window.confirm('Update Question?'))
                                  updateQuestionsMaster(index);
                              else filterQ(index);
                          } }
                      >
                          { q }
                      </h4>
                  ))
                : null }

            { posts.map((post: any) => {
                if (
                    postFilter.length !== 0 &&
                    !postFilter.includes(post.id.toString())
                )
                    return;

                const postSpans = [];

                const postInferences =
                    updateQuestion && newInferences[post.id]
                        ? [newInferences[post.id]]
                        : inferences.inferences[post.id];

                // eslint-disable-next-line no-console
                if (postFilter.length !== 0) console.log(newInferences);

                const colors = new Array<string>(post.message.length).fill(
                    'white'
                );

                for (let i = 0; i < postInferences.length; i++) {
                    const ans = postInferences[i];
                    const startInd = ans.start_ind;
                    const endInd = ans.end_ind;

                    for (let j = startInd; j <= endInd; j++) {
                        colors[j] =
                            updateQuestion && newInferences[post.id]
                                ? COLORS[questionFilter]
                                : COLORS[i];
                    }
                }

                for (let i = 0; i < post.message.length; i++) {
                    const c = post.message[i];

                    let qInd = -1;

                    if (colors[i] !== 'white') qInd = COLORS.indexOf(colors[i]);

                    if (qInd !== questionFilter && updateQuestion)
                        colors[i] = 'white';

                    postSpans.push(
                        <span
                            onClick={ () => {
                                if (colors[i] !== 'white') {
                                    updateFilterObj({
                                        forumName: post.user_full_name,
                                        question: inferences.questions[qInd],
                                        postId: post.id,
                                        qIndex: qInd,
                                    });

                                    updateFilterStatus(true);
                                }
                            } }
                            className={ `${
                                colors[i] !== 'white' ? 'answer' : ''
                            } 
                                        ${
                                            !updateQuestion &&
                                            qInd !== questionFilter &&
                                            questionFilter !== -1
                                                ? 'hidden'
                                                : ''
                                        }` }
                            style={ {
                                color: colors[i],
                            } }
                        >
                            { c }
                        </span>
                    );
                }

                return (
                    <div className="post-container">
                        <input
                            className="check-post"
                            type="checkbox"
                            disabled={ updateQuestion }
                            ref={ (el) => (selected.current[post.id] = el) }
                        />

                        <div className="post-content-container">
                            <h2>{ post.user_full_name }</h2>

                            { postSpans.map((span: any) => span) }
                        </div>

                        <div className="post-score-container">
                            { inferences.questions.map((q: any, i: any) => (
                                <input
                                    type="number"
                                    className="post-score"
                                    key={ i }
                                    placeholder={ `Grade for ${q}` }
                                    ref={ (el) => {
                                        if (!grades.current[post.id])
                                            grades.current[post.id] =
                                                new Array<HTMLInputElement>(
                                                    inferences.questions.length
                                                );

                                        grades.current[post.id][i] = el!;
                                    } }
                                />
                            )) }
                        </div>
                    </div>
                );
            }) }
        </div>
    );
}