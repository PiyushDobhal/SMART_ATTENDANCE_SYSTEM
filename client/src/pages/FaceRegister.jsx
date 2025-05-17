import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import api from "../api";
import { toast } from "react-toastify";

const FaceRegister = () => {
  const webcamRef = useRef(null);

  const [loadingModels, setLoadingModels] = useState(true);
  const [modelsError, setModelsError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [status, setStatus] = useState("");
  const [isRegistering, setIsRegistering] = useState(false); // new

  useEffect(() => {
    (async () => {
      const MODEL_URL = "/models";
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsError("");
      } catch (err) {
        setModelsError("Failed to load face models");
        toast.error("Error loading face models—check your /models folder");
      } finally {
        setLoadingModels(false);
      }
    })();
  }, []);

  const handleStart = () => {
    setShowCamera(true);
    setStatus("");
  };

  const registerFace = async () => {
    if (isRegistering) return;                // prevent double clicks
    if (loadingModels) {
      toast.info("Still loading face models…");
      return;
    }
    if (modelsError) {
      toast.error(modelsError);
      return;
    }
    if (!webcamRef.current) return;

    setIsRegistering(true);
    const toastId = toast.loading("Registering face, please wait...");

    try {
      const screenshot = webcamRef.current.getScreenshot();
      const img = await faceapi.fetchImage(screenshot);
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatus("No face detected. Try again.");
        toast.update(toastId, {
          render: "No face detected. Please try again.",
          type: toast.TYPE.ERROR,
          isLoading: false,
          autoClose: 3000,
        });
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      await api.post("/api/students/upload-face", { descriptor });

      setStatus("Face registered successfully!");
      toast.update(toastId, {
        render: "Face registered successfully! ✅",
        type: toast.TYPE.SUCCESS,
        isLoading: false,
        autoClose: 3000,
      });

      window.dispatchEvent(new Event("storage"));
      setTimeout(() => setShowCamera(false), 1000);
    } catch (err) {
      setStatus("Registration failed");
      toast.update(toastId, {
        render: "Failed to register face. Please retry.",
        type: toast.TYPE.ERROR,
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-10 pt-24">
      <h2 className="text-xl mb-4">Register Your Face</h2>

      {!showCamera && (
        <button
          onClick={handleStart}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition mb-4"
        >
          Open Camera
        </button>
      )}

      {showCamera && (
        <>
          <Webcam
            audio={false}
            ref={webcamRef}
            width={320}
            screenshotFormat="image/jpeg"
            className="rounded shadow-lg mb-4"
          />
          <button
            onClick={registerFace}
            disabled={isRegistering}
            className={`px-4 py-2 rounded transition ${
              isRegistering
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isRegistering ? "Registering…" : "Capture & Register"}
          </button>
        </>
      )}

      {loadingModels && (
        <p className="mt-4 text-gray-400">Loading face models…</p>
      )}
      {modelsError && (
        <p className="mt-4 text-red-400">Model load error: {modelsError}</p>
      )}
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
};

export default FaceRegister;
