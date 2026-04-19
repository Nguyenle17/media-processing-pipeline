import { useState } from "react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Api from "../api/Api";

export default function ExtractAudio() {
    const [videoFile, setVideoFile] = useState(null)
    const [videoURL, setVideoURL] = useState("")
    const [loading, setLoading] = useState(false)
    const { user, login, logout } = useContext(AuthContext)
    const navigate = useNavigate()

    const handleVideoChange = (event) => {
        try {
            const flie = event.target.files[0]
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

    return (
        <div>
            <h1 className="m-5 text-center text-3xl font-bold text-indigo-700">Extract Audio From Video</h1>
            <div id="videosub" className="m-10 my-10 px-10 py-10 rounded-md space-y-4 bg-linear-to-r/srgb from-cyan-300 to-emerald-400">
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                        {videoURL ? (
                            <video
                                src={videoURL}
                                width="640"
                                height="360"
                                controls
                                className="rounded shadow-lg"
                            >

                            </video>
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
                </div>
            </div>
        </div>
    )
}