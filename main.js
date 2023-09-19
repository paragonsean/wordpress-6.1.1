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
  const hrefs = [];  // Create an array to store the href URLs
  i = 0;
  for (let item of opf.querySelector('manifest').children) {
  
    console.log(i)
    const href = item.getAttribute('href');
    hrefs.push(IMPORT_URL + href);  // Add the href URL to the array
    try {
      const data = await (await fetch(`${IMPORT_URL}OPS/${href}`, { credentials: 'include' })).arrayBuffer();
      epubData.file(href, data);
      console.log('Finished downloading', href);
      i++;
     
    } catch(e) {
      console.log(`Failed to download ${href}: ${e}`);
    }
    
  }
  console.log('All href URLs:', hrefs);
  const data = await epub.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(data);
  const tmpLink = document.createElement('a');
  tmpLink.href = url;
  console.log(tmpLink.href)
  console.log(tmpLink)

  const possibleTitle = opf.querySelector('metadata title');
  const titleString = possibleTitle ? possibleTitle.innerHTML : 'textbook';
  tmpLink.download = titleString + '.epub';
  tmpLink.click();
  URL.revokeObjectURL(url);}).catch(err => alert('Textbook download failed because an error occurred: '+err));
