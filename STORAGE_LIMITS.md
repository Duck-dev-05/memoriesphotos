# Storage and File Size Limits

This document explains the environment variables used to configure storage and file size limits in the Memories Photos application.

## Environment Variables

### Video Size Limit
- **Variable Name**: `VIDEO_SIZE_LIMIT_MB` (server-side) or `NEXT_PUBLIC_VIDEO_SIZE_LIMIT_MB` (client-side)
- **Default Value**: `500` (500MB)
- **Description**: Maximum allowed size for video uploads
- **Usage**: 
  - Server-side: Checked in `uploadPhoto` action in `app/actions.ts`
  - Client-side: Checked in `DragDropUploader` component in `app/components/DragDropUploader.tsx`
- **Example**: 
  ```
  VIDEO_SIZE_LIMIT_MB=1000
  NEXT_PUBLIC_VIDEO_SIZE_LIMIT_MB=1000
  ```

### User Storage Limit
- **Variable Name**: `USER_STORAGE_LIMIT_GB` (server-side) or `NEXT_PUBLIC_USER_STORAGE_LIMIT_GB` (client-side)
- **Default Value**: `10` (10GB)
- **Description**: Maximum storage space allowed per user
- **Usage**: 
  - Server-side: Checked in `uploadPhoto` action in `app/actions.ts`
  - Displayed on upload page in `app/upload/page.tsx`
- **Example**: 
  ```
  USER_STORAGE_LIMIT_GB=20
  NEXT_PUBLIC_USER_STORAGE_LIMIT_GB=20
  ```

### Local Upload Limit
- **Variable Name**: `LOCAL_UPLOAD_LIMIT_MB` (server-side) or `NEXT_PUBLIC_LOCAL_UPLOAD_LIMIT_MB` (client-side)
- **Default Value**: `25` (25MB)
- **Description**: Maximum file size for local storage uploads (files larger than this will be uploaded to cloud storage)
- **Usage**: Checked in `saveBufferToWritableStorage` function in `app/actions.ts`
- **Example**: 
  ```
  LOCAL_UPLOAD_LIMIT_MB=50
  NEXT_PUBLIC_LOCAL_UPLOAD_LIMIT_MB=50
  ```

## Implementation Details

### Server-Side Checks
The server-side checks are implemented in `app/actions.ts`:
1. `getVideoSizeLimitBytes()` - Returns the video size limit in bytes
2. `getUserStorageLimitBytes()` - Returns the user storage limit in bytes
3. `uploadPhoto()` - Checks both video size and user storage limits before uploading

### Client-Side Checks
The client-side checks are implemented in:
1. `app/components/DragDropUploader.tsx` - Checks video size before upload
2. `app/upload/page.tsx` - Displays storage usage and limit to users

### Storage Usage Tracking
Storage usage is tracked by:
1. Storing `fileSize` for each photo in the database
2. Calculating total usage via `getStorageUsage()` function
3. Displaying usage via `getStorageInfo()` function on the upload page

## Configuration

To configure these limits, add the environment variables to your `.env` file:

```env
# Video size limit (in MB)
VIDEO_SIZE_LIMIT_MB=500
NEXT_PUBLIC_VIDEO_SIZE_LIMIT_MB=500

# User storage limit (in GB)
USER_STORAGE_LIMIT_GB=10
NEXT_PUBLIC_USER_STORAGE_LIMIT_GB=10

# Local upload limit (in MB)
LOCAL_UPLOAD_LIMIT_MB=25
NEXT_PUBLIC_LOCAL_UPLOAD_LIMIT_MB=25
```

## Notes

- Both server-side (`VIDEO_SIZE_LIMIT_MB`) and client-side (`NEXT_PUBLIC_VIDEO_SIZE_LIMIT_MB`) variables should be set to the same value for consistency
- The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js
- Storage limits are calculated based on the sum of all file sizes for a user's photos
- When storage limit is exceeded, users will see an error message and the upload will be blocked
- A storage usage banner is displayed on the upload page showing current usage and remaining space
