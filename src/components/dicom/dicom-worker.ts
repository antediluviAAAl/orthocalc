import { unzipSync } from 'fflate';

const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent) => {
  const { file, relativePath } = e.data;

  try {
    // 1. Sniff magic bytes by reading only the first 132 bytes of the file
    const headerBlob = file.slice(0, 132);
    const headerBuffer = await headerBlob.arrayBuffer();
    const headerArr = new Uint8Array(headerBuffer);

    // ZIP magic signature: PK\x03\x04 (50 4B 03 04)
    const isZip = headerArr[0] === 0x50 && headerArr[1] === 0x4b && headerArr[2] === 0x03 && headerArr[3] === 0x04;

    if (isZip) {
      // 2. Read full file to perform extraction
      const fullBuffer = await file.arrayBuffer();
      const fullArr = new Uint8Array(fullBuffer);
      const decompressed = unzipSync(fullArr);
      const keys = Object.keys(decompressed);

      if (keys.length === 0) {
        throw new Error("Empty ZIP archive wrapper");
      }

      // Grab the first inner file
      const innerFilename = keys[0];
      const innerData = decompressed[innerFilename];

      // Verify if the unzipped file has the correct DICOM signature: DICM at offset 128
      const isInnerDicom = innerData.length >= 132 &&
        innerData[128] === 0x44 && // 'D'
        innerData[129] === 0x49 && // 'I'
        innerData[130] === 0x43 && // 'C'
        innerData[131] === 0x4d;   // 'M'

      ctx.postMessage({
        status: 'SUCCESS_REPAIRED',
        relativePath,
        filename: file.name,
        innerFilename,
        data: innerData,
        originalSize: file.size,
        newSize: innerData.byteLength,
        isDicom: isInnerDicom
      }, [innerData.buffer] as any);
    } else {
      // 3. File is not zipped, let's copy it raw. Determine if it is a valid DICOM.
      const isDicom = headerArr.length >= 132 &&
        headerArr[128] === 0x44 && // 'D'
        headerArr[129] === 0x49 && // 'I'
        headerArr[130] === 0x43 && // 'C'
        headerArr[131] === 0x4d;   // 'M'

      const fullBuffer = await file.arrayBuffer();
      const fullArr = new Uint8Array(fullBuffer);

      ctx.postMessage({
        status: 'SUCCESS_SKIPPED',
        relativePath,
        filename: file.name,
        data: fullArr,
        originalSize: file.size,
        newSize: file.size,
        isDicom
      }, [fullArr.buffer] as any);
    }
  } catch (error: any) {
    ctx.postMessage({
      status: 'ERROR',
      relativePath,
      filename: file.name,
      error: error.message || 'Decompression failed'
    });
  }
};
