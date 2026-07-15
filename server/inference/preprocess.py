"""
Preprocessing utilities for the MobileNetV2 inference pipeline.
Handles image loading, resizing, and normalization.

CRITICAL: Uses the same preprocessing as training!
MobileNetV2 expects pixels in [-1, 1] range, NOT [0, 1].
"""

import numpy as np
from keras.preprocessing import image as keras_image
from keras.applications.mobilenet_v2 import preprocess_input


# MobileNetV2 expects 224x224 input
IMG_SIZE = (224, 224)

# Class labels in the same order used during training
CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]

# Human-readable labels for the API response
LABEL_MAP = {
    "fresh": "Fresh",
    "highly_fresh": "Highly Fresh",
    "not_fresh": "Not Fresh",
}


import cv2

def preprocess_for_inference(image_path_or_arr) -> np.ndarray:
    """
    Load and preprocess an image for MobileNetV2 inference.

    Uses the SAME preprocessing as training:
    - Resize to 224x224
    - Apply MobileNetV2 preprocess_input (scales to [-1, 1])

    Args:
        image_path_or_arr: Path to the image file (str) or loaded OpenCV BGR array (numpy.ndarray).

    Returns:
        Preprocessed image as a numpy array with shape (1, 224, 224, 3).
    """
    if isinstance(image_path_or_arr, str):
        img_bgr = cv2.imread(image_path_or_arr)
        if img_bgr is None:
            raise FileNotFoundError(f"Failed to read image at: {image_path_or_arr}")
    else:
        img_bgr = image_path_or_arr

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, IMG_SIZE)
    img_array = img_resized.astype(np.float32)
    img_array = np.expand_dims(img_array, axis=0)  # shape: (1, 224, 224, 3)
    img_array = preprocess_input(img_array)  # scales to [-1, 1] for MobileNetV2
    return img_array
