"""
Image Utility and Pre-Validation Library for FreshWay.

Provides non-destructive image quality checks:
- Cornea specular glare & highlight saturation detection
- Sharpness & motion blur detection
- Aspect ratio and dimension validation
- Center and ROI cropping helpers
"""

import os
import numpy as np
from PIL import Image

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False


def get_image_metadata(image_path: str) -> dict:
    """Extract basic dimensions and format details."""
    with Image.open(image_path) as img:
        width, height = img.size
        return {
            "width": width,
            "height": height,
            "aspect_ratio": round(width / height, 2) if height > 0 else 1.0,
            "format": img.format,
            "mode": img.mode,
        }


def check_glare(image_path: str, threshold: float = 0.15) -> dict:
    """
    Detect excessive specular highlights / flash glare on the fish eye.

    Corneal reflections from camera flash produce pure white washed-out
    regions (R, G, B > 240) that mask underlying lens transparency.

    Returns:
        dict: { "has_excessive_glare": bool, "glare_ratio": float }
    """
    with Image.open(image_path) as img:
        rgb = img.convert("RGB")
        arr = np.array(rgb)

    # Highlight pixels where all three RGB channels are near maximum
    bright_pixels = (arr[:, :, 0] > 240) & (arr[:, :, 1] > 240) & (arr[:, :, 2] > 240)
    glare_ratio = float(np.mean(bright_pixels))

    return {
        "has_excessive_glare": glare_ratio > threshold,
        "glare_ratio": round(glare_ratio, 4),
        "warning": "High specular glare detected. Consider diffusing the light source." if glare_ratio > threshold else None
    }


def check_blur(image_path: str, threshold: float = 60.0) -> dict:
    """
    Estimate image sharpness / motion blur.

    Uses Laplacian variance via OpenCV if installed, or fallback
    finite-difference gradient variance using NumPy.

    Returns:
        dict: { "is_blurry": bool, "sharpness_score": float }
    """
    if HAS_OPENCV:
        img_gray = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img_gray is None:
            return {"is_blurry": False, "sharpness_score": 100.0, "warning": None}
        score = float(cv2.Laplacian(img_gray, cv2.CV_64F).var())
    else:
        # Fallback using PIL + NumPy finite differences
        with Image.open(image_path) as img:
            gray = np.array(img.convert("L"), dtype=float)
            # Compute 2D gradient magnitude
            gy, gx = np.gradient(gray)
            score = float(np.var(gx) + np.var(gy))

    is_blurry = score < threshold
    return {
        "is_blurry": is_blurry,
        "sharpness_score": round(score, 2),
        "warning": "Image appears blurry. Please hold camera steady and refocus." if is_blurry else None
    }


def validate_image_quality(image_path: str) -> dict:
    """
    Comprehensive quality check before running neural network inference.
    """
    if not os.path.exists(image_path):
        return {"valid": False, "error": "Image file does not exist"}

    meta = get_image_metadata(image_path)
    glare = check_glare(image_path)
    blur = check_blur(image_path)

    warnings = []
    if glare["warning"]:
        warnings.append(glare["warning"])
    if blur["warning"]:
        warnings.append(blur["warning"])

    return {
        "valid": True,
        "metadata": meta,
        "glare": glare,
        "blur": blur,
        "warnings": warnings,
    }
