import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ExtractAudio() {
    const [videoFile, setVideoFile] = useState(null);
    const [videoURL, setVideoURL]   = useState(null);  
    const [loading, setLoading]     = useState(false);

    const { user }  = useContext(AuthContext);
    const navigate  = useNavigate();

    const handleVideoChange = (event) => {
        try {
            const file = event.target.files[0];  

            if (!user) {
                alert("Please log in to upload a video.");
                navigate('/login');
                return;
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
    };

    return (
        <div>
            <h1 className="m-5 text-center text-3xl font-bold text-indigo-700">
                Extract Audio From Video
            </h1>
            <div
                id="videosub"
                className="m-10 my-10 px-10 py-10 rounded-md space-y-4 bg-linear-to-r/srgb from-cyan-300 to-emerald-400"
            >
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                        <video
                            src={videoURL || '/videos/sample.mp4'}
                            width="640"
                            height="360"
                            controls
                            className="rounded shadow-lg"
                        />
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
    );
}