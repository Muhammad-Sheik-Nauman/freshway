"""
Preprocessing utilities for the FreshWay inference pipeline.
Handles image loading, direct resizing, and normalization.

CRITICAL: Matches the EXP-006 evaluation preprocessing.
MobileNetV2 expects pixels in [-1, 1] range, NOT [0, 1].
"""

import numpy as np
from PIL import Image
from tensorflow.keras.preprocessing import image as keras_image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# Standard input dimensions
IMG_SIZE = (224, 224)

# Class labels in the exact order used during training
CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]

# Human-readable labels for API response
LABEL_MAP = {
    "fresh": "Fresh",
    "highly_fresh": "Highly Fresh",
    "not_fresh": "Not Fresh",
}


def smart_center_crop(img: Image.Image) -> Image.Image:
    """
    Center-crop an image to a 1:1 square aspect ratio without distortion.

    Prevents squashing or stretching non-square camera photos (4:3, 16:9),
    which preserves the true spherical curvature and circularity of the fish eye.
    """
    width, height = img.size
    if width == height:
        return img

    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim

    return img.crop((left, top, right, bottom))


def preprocess_for_inference(image_path: str) -> np.ndarray:
    """
    Load and preprocess an image for MobileNetV2 inference.

    Steps:
    1. Load image via Pillow.
    2. Convert to RGB if necessary (handles RGBA / grayscale).
    3. Directly resize to 224x224 using nearest-neighbor resampling without cropping.
    4. Convert to float numpy array and add batch dimension (1, 224, 224, 3).
    5. Apply MobileNetV2 preprocess_input (scales to [-1, 1]).

    Args:
        image_path: Path to the image file.

    Returns:
        Preprocessed image tensor with shape (1, 224, 224, 3).
    """
    with Image.open(image_path) as raw_img:
        rgb_img = raw_img.convert("RGB")
        resized_img = rgb_img.resize(IMG_SIZE, Image.Resampling.NEAREST)
        img_array = keras_image.img_to_array(resized_img)

    img_array = np.expand_dims(img_array, axis=0)  # shape: (1, 224, 224, 3)
    img_array = preprocess_input(img_array)         # scales to [-1, 1] for MobileNetV2
    return img_array
