"""
cloudinary_service.py
Python port of cloudinary.service.js.
Handles PDF uploads to Cloudinary.
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_cloudinary():
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    return cloudinary


def upload_pdf_to_cloudinary(file_buffer: bytes, file_name: str) -> dict:
    """
    Upload a PDF buffer to Cloudinary.
    Equivalent to uploadPDFToCloudinary() in cloudinary.service.js.
    Returns the Cloudinary response dict containing secure_url.
    """
    import cloudinary.uploader
    cld = _get_cloudinary()

    # Strip extension from public_id
    public_id = file_name.rsplit(".", 1)[0] if "." in file_name else file_name

    result = cloudinary.uploader.upload(
        file_buffer,
        folder="interviewai/resumes",
        resource_type="raw",
        public_id=public_id,
        format="pdf",
    )
    logger.info("✅ Cloudinary upload successful: %s", result.get("secure_url"))
    return result


def delete_cloudinary_file(public_id: str) -> None:
    """
    Delete a file from Cloudinary by public_id.
    Equivalent to deleteCloudinaryFile() in cloudinary.service.js.
    """
    try:
        import cloudinary.uploader
        _get_cloudinary()
        cloudinary.uploader.destroy(public_id, resource_type="raw")
    except Exception as exc:
        logger.error("Error deleting file from Cloudinary: %s", exc)
