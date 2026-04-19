import { useState } from "react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Api from "../api/Api";

export default function Summary() {
    const [text, setText] = useState("Video info will be displayed here after uploading.");
    const [videoURL, setVideoURL] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const { user, login, logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();


    const handleVideoChange = (event) => {
        try {
            const file = event.target.files[0];
            if (!user) {
                alert("Please log in to upload a video.");
                navigate('/login');
            }
            if (file) {
                const url = URL.createObjectURL(file);
                setVideoURL(url);
                setVideoFile(file);
            } else {
                setVideoURL(null);
                setVideoFile(null);
            }
        } catch (error) {
            console.error("Error handling video change:", error);
        }
    }

    const handleSubmitVideo = async () => {
        try {
            setLoading(true);
            if (!user) {
                alert("Please log in to submit a video.");
                navigate('/login');
                return;
            }
            if (!videoURL) {
                alert("No video selected.");
                return;
            }

            const data = new FormData();
            data.append('video', videoFile);
            const response = await Api.post('/video/transcribe/summary', data, 'multipart/form-data');
            console.log(response)
            setText(response.text);
        } catch (error) {
            console.error("Error submitting video:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleCopyText = async () => {
        await navigator.clipboard.writeText(text)
    }
    return (
        <div>
            <h1 className="my-5 text-center text-3xl font-bold text-indigo-700">Summay Script From Video</h1>
            <div id="videosub" className="m-10 my-10 px-10 py-10 rounded-md space-y-4 bg-linear-to-r/srgb from-yellow-500 to-rose-400">
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                        {videoURL ? (
                            <video
                                src={videoURL}
                                width="640"
                                height="360"
                                controls
                                className="rounded shadow-lg"
                            ></video>
                        ) : (
                            <video
                                src="/videos/sample.mp4"
                                width="640"
                                height="360"
                                controls
                                className="rounded shadow-lg"
                            >
                            </video>
                        )}
                        <input
                            type="file"
                            accept="video/*"
                            className="file-input file-input-primary"
                            onChange={handleVideoChange}
                        />
                    </div>
                    <div className="p-5 rounded shadow-lg bg-white shadow-lg relative">
                        <div className=" absolute right-2 top-2 cursor-pointer" onClick={handleCopyText}>
                            <img src="/src/assets/copy.png" alt="icon-copy" className="w-[24px]" />
                        </div>
                        {!loading ? (text) : (
                            <div className="flex flex-col items-center justify-center m-5 space-y-4 font-semibold">
                                <div className="w-[60px] h-[60px] border-4 border-[#7d7d7d] border-t-[#3432a8] rounded-full animate-spin border-purple-600 mx-auto">
                                </div>
                                <p className="text-[18px]">Processing...</p>
                            </div>
                        )}
                    </div>
                </div>
                <p className="mb-2 text-white">
                    Create professional subtitles with just a few clicks.</p>
                <button className="btn btn-accent btn-wide" onClick={handleSubmitVideo}>Start Now</button>
            </div>
        </div>
    )
}