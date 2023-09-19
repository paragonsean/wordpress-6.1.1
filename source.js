// Source code for the downloader.
import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js').then(async () => {
  alert('This is the McGraw-Hill Education Textbook Downloader. Click OK to start downloading the files.');
  const IMPORT_URL = (await (await fetch('https://player-api.mheducation.com/lti', { credentials: 'include' })).json()).custom_epub_url;
  const epub = new JSZip();
  const metaInf = epub.folder('META-INF');
  metaInf.file('container.xml', await (await fetch(IMPORT_URL + 'META-INF/container.xml', { credentials: 'include' })).text());
  const epubData = epub.folder('OPS');
  const opfString = await (await fetch(IMPORT_URL + 'OPS/content.opf', { credentials: 'include' })).text();
  epubData.file('content.opf', opfString);
  const opf = new DOMParser().parseFromString(opfString, 'application/xml');
  for (let item of opf.querySelector('manifest').children) {
    const href = item.getAttribute('href');
    try {
      const data = await (await fetch(`${IMPORT_URL}OPS/${href}`, { credentials: 'include' })).arrayBuffer();
      epubData.file(href, data);
      console.log('Finished downloading', href);
     } catch(e) {
       throw `Failed to download ${href}: ${e}`;
     }
  }

  let counter = 0;
  for (let item of opf.querySelector('manifest').children) {
    if (counter >= 1000) {
      break; // Stop after 1000 files
    }
    const href = item.getAttribute('href');
    try {
      const data = await (await fetch(`${IMPORT_URL}OPS/${href}`, { credentials: 'include' })).arrayBuffer();
      epubData.file(href, data);
      console.log('Finished downloading', href);
    } catch(e) {
      throw `Failed to download ${href}: ${e}`;
    }
    counter++;
  }
  
  alert('Finished downloading data! Click OK to start compression.');
  window.__savedTextbook = epub;
  let highestPercent = 0;
  const data = await epub.generateInternalStream({ type: 'blob' }).accumulate(({ percent }) => {
    const intPercent = Math.floor(percent);
    if (intPercent > highestPercent) {
      console.log(intPercent + '% complete');
      highestPercent = intPercent;
    }
  });
  
  window.__savedTextbookEpub = data;
  const url = URL.createObjectURL(data);
  const tmpLink = document.createElement('a');
  tmpLink.href = url;
  const possibleTitle = opf.querySelector('metadata title');
  const titleString = possibleTitle ? possibleTitle.innerHTML : 'textbook';
  tmpLink.download = titleString + '.epub';
  tmpLink.click();
  URL.revokeObjectURL(url);
}).catch(err => alert('Textbook download failed because an error occurred: '+err));
