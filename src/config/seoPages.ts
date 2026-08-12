import type { EngineId } from '../engine/types';
import type { PresetId, UserOverrides } from './presets';

export interface Faq {
  q: string;
  a: string;
}

export interface SeoPage {
  slug: string;
  /** <title> text (the site name is appended). */
  title: string;
  h1: string;
  description: string;
  /** Short line under the H1. */
  lead: string;
  tool: 'compressor' | 'zip';
  focus?: EngineId;
  preset?: PresetId;
  overrides?: Partial<UserOverrides>;
  guideTitle: string;
  guide: string[];
  faqs: Faq[];
  related: string[];
  /** Breadcrumb parent slug, if any. */
  parent?: string;
}

/** Keeps "100 KB" on one line in headings. */
const NBSP = String.fromCharCode(0xa0);

const PRIVACY_FAQ: Faq = {
  q: 'Are my files uploaded anywhere?',
  a: 'No. Everything happens inside your browser on your own device. Your files are never sent to a server, so nobody else can see them, and there is nothing to delete afterwards.',
};

export const SEO_PAGES: SeoPage[] = [
  {
    slug: 'compress-image',
    title: 'Compress images online (JPG, PNG, WebP, HEIC) — free & private',
    h1: 'Compress images',
    description:
      'Shrink JPG, PNG, WebP, AVIF and HEIC photos in your browser. No uploads, no signup, no limits. Batch compress and download everything as a ZIP.',
    lead: 'Make photos and graphics smaller without visible quality loss. Works on whole folders.',
    tool: 'compressor',
    focus: 'image',
    guideTitle: 'How image compression works here',
    guide: [
      'Drop one photo or a whole folder. Each image is decoded on your device, resized if you asked for it, and re-encoded with modern encoders: MozJPEG for JPEG, OxiPNG for PNG, and libwebp and AVIF for the newer formats. The default "Balanced" goal usually removes 60–80% of a camera photo’s size while looking the same on screen.',
      'If you need a file under a specific size, pick a goal like "Under 100 KB". The tool searches for the highest quality that fits, and only shrinks the dimensions if the target can’t be met otherwise. PNG screenshots and logos can be made much smaller with the "fewer colours" option under More options.',
      'Hidden details such as GPS location and camera model are removed by default, which is safer when you share photos online. You can keep them if you need to. Use the compare slider to check the result up close before you download.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Which formats are supported?',
        a: 'JPEG, PNG, WebP, AVIF, HEIC (iPhone photos), GIF and BMP. By default each image keeps its format. HEIC is converted to JPEG so it opens everywhere.',
      },
      {
        q: 'Will my photos lose quality?',
        a: 'With the Balanced goal, differences are very hard to see at normal viewing size. Use the compare slider to zoom in and decide for yourself, or move the quality slider towards "Better quality".',
      },
      {
        q: 'Is there a limit on how many images I can compress?',
        a: 'No. There are no daily limits or file caps. Large batches are processed a few at a time so your browser stays responsive.',
      },
      {
        q: 'Should I convert to WebP or AVIF?',
        a: 'For websites, yes: WebP is typically 25–35% smaller than JPEG and works in all modern browsers. AVIF is smaller still but slower to create. For sending to other people, JPEG is the safest choice.',
      },
    ],
    related: [
      'compress-jpg',
      'compress-png',
      'compress-heic',
      'png-to-webp',
      'compress-image-to-100kb',
    ],
  },
  {
    slug: 'compress-pdf',
    title: 'Compress PDF online — free, private, keeps text selectable',
    h1: 'Compress PDF files',
    description:
      'Reduce PDF file size in your browser. Smart mode shrinks images and keeps text selectable; Scanned mode makes scans tiny. No uploads, no watermark.',
    lead: 'Make PDFs small enough to email or upload, without sending them anywhere.',
    tool: 'compressor',
    focus: 'pdf',
    guideTitle: 'Two ways to shrink a PDF',
    guide: [
      'Most large PDFs are large because of the pictures inside them. In Smart mode, the tool finds every embedded image, lowers its resolution to what is needed for reading and printing (150 DPI on Balanced), and re-encodes it efficiently. Text, links and fonts are left untouched, so you can still select and search the text.',
      'Scanned documents are different: each page is already one big picture. For those, Scanned mode renders every page as a compact image and rebuilds the PDF. It gives the smallest files, but the text can no longer be selected, so the tool only suggests it when your file looks like a scan.',
      'Need to meet an upload limit? Choose "Under 500 KB" or "Custom size" and the tool steps the image quality down until the file fits. PDFs that are mostly text are already small; if compression wouldn’t help, you keep the original.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Will the text in my PDF still be selectable?',
        a: 'Yes, in Smart mode (the default). Only Scanned mode turns pages into images, and it tells you clearly before you use it.',
      },
      {
        q: 'Can it compress a password-protected PDF?',
        a: 'No. Locked PDFs can’t be changed without the password, and this tool never tries to break encryption. Remove the password in your PDF app first.',
      },
      {
        q: 'Why did my PDF barely get smaller?',
        a: 'PDFs that are mostly text and vector graphics are already compact. The big savings come from photos and scans inside the document.',
      },
      {
        q: 'Is there a page or size limit?',
        a: 'No fixed limit. Very large documents simply take longer, and everything runs on your own device.',
      },
    ],
    related: [
      'compress-pdf-to-100kb',
      'compress-pdf-to-200kb',
      'compress-pdf-to-500kb',
      'compress-pdf-to-1mb',
    ],
  },
  {
    slug: 'compress-video',
    title: 'Compress video online (MP4, MOV, WebM) — free, no upload',
    h1: 'Compress videos',
    description:
      'Make MP4, MOV, WebM and MKV videos smaller right in your browser using hardware-accelerated encoding. Hit exact sizes for WhatsApp, Discord or email.',
    lead: 'Shrink phone videos and screen recordings without uploading them anywhere.',
    tool: 'compressor',
    focus: 'video',
    guideTitle: 'How video compression works in your browser',
    guide: [
      'Modern browsers can encode video using your computer’s own hardware, the same way video editing apps do. This tool uses that (the WebCodecs API), so even long videos compress quickly and never leave your device. The result is an MP4 that plays everywhere, or WebM if you prefer.',
      'To hit a size limit, pick a goal such as Discord or Email. The tool works out the right bitrate from the video’s length, lowers the resolution if the budget is too tight for sharp HD, and retries if the first attempt comes out slightly too big. For general use, Balanced keeps the original resolution with a sensible quality.',
      'More options lets you choose a resolution (1080p down to 360p), cap the frame rate, or remove the sound entirely, which is handy for screen recordings. Large files are written to temporary browser storage rather than memory, so big videos don’t crash the tab.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Which browsers can compress video?',
        a: 'Recent versions of Chrome, Edge, Firefox and Safari. If your browser is missing the video features, the page tells you instead of failing silently.',
      },
      {
        q: 'How long does it take?',
        a: 'Usually faster than the video’s own length on a modern laptop, thanks to hardware encoding. A progress bar with a time estimate is shown for each file.',
      },
      {
        q: 'Can I compress a 1 GB video?',
        a: 'Yes. Files are read in pieces and the output is written to temporary storage in your browser, so it doesn’t need to fit in memory.',
      },
      {
        q: 'Why did my video get only slightly smaller?',
        a: 'Videos from streaming services or already-compressed exports are often efficient. Choose a lower resolution or a size goal for bigger savings.',
      },
    ],
    related: [
      'compress-video-for-whatsapp',
      'compress-video-for-discord',
      'compress-video-for-email',
      'compress-audio',
    ],
  },
  {
    slug: 'compress-audio',
    title: 'Compress audio online (MP3, WAV, M4A) — free & private',
    h1: 'Compress audio files',
    description:
      'Convert and shrink MP3, WAV, M4A, AAC, OGG and FLAC files in your browser. Turn huge WAV recordings into small AAC or MP3 files. Nothing is uploaded.',
    lead: 'Shrink recordings, podcasts and voice notes to a size that’s easy to share.',
    tool: 'compressor',
    focus: 'audio',
    guideTitle: 'Choosing the right audio settings',
    guide: [
      'Uncompressed WAV and FLAC files are large: a minute of CD-quality WAV is about 10 MB. Converting to AAC (.m4a) at 128 kbps makes it roughly ten times smaller while still sounding great for music. For speech, podcasts and voice notes, 64 kbps is plenty and smaller again.',
      'By default MP3 files stay MP3 and Ogg files stay Opus, while WAV and FLAC become AAC because it plays everywhere. You can choose MP3 or Opus under More options. Opus gives the best quality for its size, but some older devices can’t play it.',
      'If you need a file under a specific size, choose a goal like Email or set a custom size, and the bitrate is calculated from the length of the recording. Very low bitrates automatically switch to mono, which keeps voices clear.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Which format should I choose?',
        a: 'AAC (.m4a) for the best balance of size and compatibility, MP3 if the file must play on very old devices, and Opus for the smallest files on modern devices.',
      },
      {
        q: 'Will compressing make my audio sound worse?',
        a: 'At 128 kbps and above, most people can’t hear a difference for music. Lower settings are fine for speech.',
      },
      {
        q: 'Can I compress a long podcast or lecture?',
        a: 'Yes. Files are read in pieces rather than all at once, and the Voice setting (64 kbps) keeps hour-long recordings small.',
      },
      {
        q: 'Does it keep song titles and artwork?',
        a: 'Tags are removed by default for privacy. Untick the "remove hidden details" option to keep them.',
      },
    ],
    related: ['compress-video', 'compress-video-for-email', 'zip'],
  },
  {
    slug: 'zip',
    title: 'Create and open ZIP, RAR and 7z files online — private',
    h1: 'ZIP files and folders, or open archives',
    description:
      'Create ZIP files from files and folders, optionally compressing photos and videos first, and extract ZIP, RAR, 7z and TAR archives. All in your browser.',
    lead: 'Bundle files into one ZIP, or open an archive someone sent you, without uploading anything.',
    tool: 'zip',
    focus: 'archive',
    guideTitle: 'Zipping and unzipping in your browser',
    guide: [
      'Drop files or whole folders to build a ZIP. Folder structure is kept, so the person you send it to sees the same layout. Turn on "Compress first" and photos, PDFs, videos and audio are shrunk before they’re zipped; this matters because ZIP itself can’t make already-compressed files like JPEGs and MP4s much smaller.',
      'To open an archive, drop a ZIP, RAR, 7z, TAR or TAR.GZ file and choose Open. You’ll see what’s inside before extracting, then you can download single files, download everything as a ZIP, or send the contents straight to the compressor.',
      'Password-protected ZIP files are supported: the password is used only on your device to unlock the archive. The extraction engine is loaded only when you open an archive, so the rest of the site stays fast.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Can I open RAR and 7z files?',
        a: 'Yes. ZIP, RAR (v4 and v5), 7z, TAR and TAR.GZ archives can be opened and extracted.',
      },
      {
        q: 'Why is my ZIP almost as big as the original files?',
        a: 'Photos, videos and PDFs are already compressed, so zipping alone saves little. Turn on "Compress first" to actually shrink them.',
      },
      {
        q: 'Can I create a password-protected ZIP?',
        a: 'Not yet. Opening password-protected archives is supported; creating them is planned.',
      },
      {
        q: 'Is there a size limit?',
        a: 'No fixed limit. Very large archives depend on how much memory your device has.',
      },
    ],
    related: ['compress-image', 'compress-pdf', 'compress-video'],
  },

  // ---------- Target-size pages ----------
  ...(
    [
      ['20', 'u20kb', 'signatures, thumbnails and tiny form fields'],
      ['50', 'u50kb', 'online forms and profile pictures'],
      ['100', 'u100kb', 'job portals, exam forms and ID uploads'],
      ['200', 'u200kb', 'application forms and marketplace listings'],
    ] as const
  ).map(([kb, preset, uses]): SeoPage => ({
    slug: `compress-image-to-${kb}kb`,
    title: `Compress image to ${kb} KB online — JPG & PNG, free`,
    h1: `Compress an image to ${kb}${NBSP}KB`,
    description: `Reduce a photo or image to under ${kb} KB in seconds, right in your browser. Ideal for ${uses}. No uploads and no signup.`,
    lead: `Get any photo under ${kb} KB while keeping it as sharp as possible.`,
    tool: 'compressor',
    focus: 'image',
    preset,
    parent: 'compress-image',
    guideTitle: `Getting a photo under ${kb} KB`,
    guide: [
      `Many websites only accept images below ${kb} KB, which is common for ${uses}. Drop your photo above and the "Under ${kb} KB" goal is already selected. The tool tries different quality levels and keeps the best-looking version that still fits the limit, so you don’t have to guess settings.`,
      Number(kb) <= 50
        ? `${kb} KB is small for a modern phone photo, so the tool will usually also reduce the width and height a little. That’s normal and is what most forms expect anyway: they display images small. If the result looks soft, crop the photo first so only the important part is kept.`
        : `For a typical phone photo, ${kb} KB is reachable without changing its dimensions much. If the image has lots of fine detail, like foliage or text, the tool may shrink it slightly so it still looks clean instead of blocky.`,
      'The file keeps its original format (JPEG stays JPEG, PNG stays PNG), because forms often only accept specific formats. Location and camera details are removed by default. Check the result with the compare slider, then download it.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: `What if the image is already under ${kb} KB?`,
        a: 'It is kept as it is (minus hidden location and camera details), and marked as already under the target.',
      },
      {
        q: `Can I compress several images to ${kb} KB at once?`,
        a: 'Yes. Drop them all together; each one is compressed to fit the limit and you can download them individually or as one ZIP.',
      },
      {
        q: 'The form also requires specific pixel dimensions. Can I set those?',
        a: 'Yes. Open More options and enter a maximum width and height. The tool resizes first, then compresses to the size limit.',
      },
      {
        q: 'Why does my result look a bit blurry?',
        a: 'Very small size limits leave little room for detail. Cropping the photo to the important area before compressing gives a much sharper result.',
      },
    ],
    related: [
      'compress-image-to-20kb',
      'compress-image-to-50kb',
      'compress-image-to-100kb',
      'compress-image-to-200kb',
      'reduce-photo-size-for-job-application',
    ].filter((s) => s !== `compress-image-to-${kb}kb`),
  })),
  ...(
    [
      ['100kb', '100 KB', 'u100kb'],
      ['200kb', '200 KB', 'u200kb'],
      ['500kb', '500 KB', 'u500kb'],
      ['1mb', '1 MB', 'u1mb'],
    ] as const
  ).map(([slug, label, preset]): SeoPage => ({
    slug: `compress-pdf-to-${slug}`,
    title: `Compress PDF to ${label} online — free, no upload`,
    h1: `Compress a PDF to ${label.replace(' ', NBSP)}`,
    description: `Reduce a PDF to under ${label} for upload portals and email, directly in your browser. Text stays selectable. No watermark, no signup.`,
    lead: `Fit your PDF under ${label} without sending it to anyone.`,
    tool: 'compressor',
    focus: 'pdf',
    preset,
    parent: 'compress-pdf',
    guideTitle: `How to get a PDF under ${label}`,
    guide: [
      `Upload portals for applications, visas, universities and government services often cap PDFs at ${label}. Drop your document above with the "Under ${label}" goal already selected. The tool lowers the resolution and quality of pictures inside the PDF step by step, and stops at the first version that fits, so the document stays as readable as possible.`,
      'Text, signatures made of vector lines, and links are not touched, so the document stays searchable. If your PDF is a scan (every page is a photo), the tool will suggest Scanned mode, which is far more effective for that kind of file.',
      label === '100 KB' || label === '200 KB'
        ? `${label} is tight for a multi-page scan. If the tool can’t reach it, it gives you the smallest version it could make. Splitting the document, or scanning in black and white, will help.`
        : `${label} is comfortable for most documents, so quality usually stays high. PDFs that are mostly text are often already under the limit and are kept as they are.`,
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Will the document still be readable?',
        a: 'Yes. Images are reduced only as much as needed to reach the limit. Open the compare view to check the first page before downloading.',
      },
      {
        q: 'What if the tool can’t reach the size?',
        a: 'You get the smallest version possible with a clear note. For scans, try Scanned mode under More options, or split the PDF into parts.',
      },
      {
        q: 'Can I compress a password-protected PDF?',
        a: 'No. Remove the password in your PDF app first; this tool never tries to bypass encryption.',
      },
      {
        q: 'Is there a watermark?',
        a: 'Never. The file you download contains only your document.',
      },
    ],
    related: [
      'compress-pdf',
      'compress-pdf-to-100kb',
      'compress-pdf-to-200kb',
      'compress-pdf-to-500kb',
      'compress-pdf-to-1mb',
    ].filter((s) => s !== `compress-pdf-to-${slug}`),
  })),

  // ---------- Platform video pages ----------
  {
    slug: 'compress-video-for-whatsapp',
    title: 'Compress video for WhatsApp — free, in your browser',
    h1: 'Compress a video for WhatsApp',
    description:
      'Make videos small enough to send on WhatsApp in good quality. Converts to 720p MP4 in your browser, without uploading the video anywhere.',
    lead: 'Send clear videos on WhatsApp without them being crushed or rejected.',
    tool: 'compressor',
    focus: 'video',
    preset: 'whatsapp',
    parent: 'compress-video',
    guideTitle: 'Getting videos ready for WhatsApp',
    guide: [
      'WhatsApp re-compresses videos heavily and limits how large a video message can be, which is why long clips often arrive blurry or can’t be sent at all. Preparing the video yourself gives you control: this preset converts it to 720p MP4 with good quality, which looks sharp on phones and sends quickly.',
      'Drop the video above and the WhatsApp goal is already selected. The conversion runs on your device using hardware acceleration, so even a few minutes of 4K footage finishes in reasonable time. When it’s done, save it to your phone or computer and send it as usual.',
      'If WhatsApp still says the video is too large, trim it or pick a lower resolution under More options. Sending it as a document keeps the quality exactly as you made it.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'What resolution does the WhatsApp preset use?',
        a: '720p, which looks sharp on phone screens and keeps files small. Videos that are already 720p or smaller keep their resolution.',
      },
      {
        q: 'Does it work on my phone?',
        a: 'Yes, in recent Chrome on Android and Safari on iPhone. Very long videos are faster on a computer.',
      },
      {
        q: 'Will the sound be kept?',
        a: 'Yes, audio is kept and converted to AAC. You can remove it under More options.',
      },
      {
        q: 'Is the video uploaded to WhatsApp or anyone else?',
        a: 'No. The file only leaves your device when you choose to send it yourself.',
      },
    ],
    related: ['compress-video', 'compress-video-for-discord', 'compress-video-for-email'],
  },
  {
    slug: 'compress-video-for-discord',
    title: 'Compress video for Discord (under the upload limit) — free',
    h1: 'Compress a video for Discord',
    description:
      'Get any clip under Discord’s free upload limit in your browser. The bitrate is calculated from the video length so it fits first time.',
    lead: 'Fit gameplay clips and recordings under the Discord upload limit.',
    tool: 'compressor',
    focus: 'video',
    preset: 'discord',
    parent: 'compress-video',
    guideTitle: 'Fitting under Discord’s upload limit',
    guide: [
      'Discord limits file uploads for accounts without Nitro, and a few seconds of 1080p gameplay can already be over it. The Discord goal targets just under that limit, leaving a small safety margin. The tool reads the clip’s length, calculates the bitrate that fits, and lowers the resolution if the clip is too long to stay sharp at full HD.',
      'Encoding happens on your graphics hardware through the browser, so it’s quick, and the clip never passes through a third-party server. If the first result lands slightly over the target, the tool automatically tries again a little smaller.',
      'For long recordings, a size limit means low quality. Trimming to the moment that matters, or dropping to 30 fps under More options, keeps the picture much cleaner. Upload limits change from time to time, so check Discord’s current limit if an upload is rejected.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'What size does the Discord preset aim for?',
        a: 'Just under 10 MB, Discord’s long-standing free limit, with a safety margin. The value lives in one config setting and is easy to update if Discord changes it.',
      },
      {
        q: 'My 5-minute clip looks blurry. Why?',
        a: 'Five minutes in under 10 MB leaves very little data per second. Trim the clip or use a larger goal like Email.',
      },
      {
        q: 'Can it keep 60 fps?',
        a: 'Yes, the frame rate is kept unless you cap it. Capping to 30 fps gives each frame more detail at the same size.',
      },
      {
        q: 'What format is the output?',
        a: 'MP4, which Discord previews inline on desktop and mobile.',
      },
    ],
    related: ['compress-video', 'compress-video-for-whatsapp', 'compress-video-for-email'],
  },
  {
    slug: 'compress-video-for-email',
    title: 'Compress video for email (fits Gmail attachments) — free',
    h1: 'Compress a video to send by email',
    description:
      'Shrink a video to fit Gmail and Outlook attachment limits, directly in your browser. No uploads, no account and no watermark.',
    lead: 'Attach videos to email instead of sending a download link.',
    tool: 'compressor',
    focus: 'video',
    preset: 'email',
    parent: 'compress-video',
    guideTitle: 'Making a video small enough to attach',
    guide: [
      'Gmail allows attachments up to 25 MB and Outlook is similar. Anything bigger is turned into a cloud-drive link, which the recipient has to open separately. The Email goal targets 24 MB so there’s room for the email itself, then calculates the bitrate from the video’s length.',
      'Short clips keep their full resolution. Longer videos are reduced to 720p or lower so they still look clean rather than blocky. Everything is done on your own device, which also means you can compress private family videos without handing them to a web service.',
      'If the video is several minutes long, consider trimming it first or sending the highlights. Audio is kept at a quality that’s clear for speech and music.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Does this work for Outlook and Yahoo too?',
        a: 'Yes. They have similar limits of about 20–25 MB, and the Email goal fits all of them.',
      },
      {
        q: 'How long a video can fit in an email?',
        a: 'Roughly 1–2 minutes at good 720p quality, or longer at lower resolutions.',
      },
      {
        q: 'Can I email other big files the same way?',
        a: 'Yes. The Email goal also works for PDFs, images and audio on the main page.',
      },
      {
        q: 'Will the recipient be able to play it?',
        a: 'Yes. The output is a standard MP4 that plays on phones, Windows and Mac without extra apps.',
      },
    ],
    related: ['compress-video', 'compress-video-for-whatsapp', 'compress-pdf'],
  },

  // ---------- Format pages ----------
  {
    slug: 'compress-jpg',
    title: 'Compress JPG / JPEG online — free, private, no limits',
    h1: 'Compress JPG images',
    description:
      'Reduce JPG and JPEG file size by 60–80% with MozJPEG, right in your browser. Batch compress photos and remove GPS data. No uploads.',
    lead: 'Smaller JPEGs that look the same, made on your device.',
    tool: 'compressor',
    focus: 'image',
    parent: 'compress-image',
    guideTitle: 'Why your JPEGs can be much smaller',
    guide: [
      'Phones and cameras save JPEGs quickly rather than efficiently, so their files are often three to five times larger than they need to be. This tool re-encodes them with MozJPEG, an encoder built by Mozilla to squeeze more out of the JPEG format while keeping it compatible with every device and app.',
      'The Balanced goal is tuned for photos you’ll view on screens and share online. Drag the quality slider towards "Better quality" for prints, or pick a size goal when a website has an upload limit. Progressive encoding is used, so large images start to appear quickly on web pages.',
      'Photos from phones contain your GPS location by default. That data is removed unless you choose to keep it, and the image is rotated correctly first so nothing ends up sideways.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Is JPG the same as JPEG?',
        a: 'Yes. They’re two file extensions for exactly the same format.',
      },
      {
        q: 'How much smaller will my photos get?',
        a: 'Typically 60–80% for photos straight from a phone or camera. Photos that were already optimised are kept as they are.',
      },
      {
        q: 'Can I keep the EXIF data?',
        a: 'Yes. Untick "remove hidden details" under More options to keep camera and date information.',
      },
      {
        q: 'Should I use WebP instead?',
        a: 'For websites, WebP saves another 25–35%. The tool will suggest it when the saving is worthwhile.',
      },
    ],
    related: ['compress-image', 'compress-png', 'jpg-to-avif', 'compress-image-to-100kb'],
  },
  {
    slug: 'compress-png',
    title: 'Compress PNG online — lossless or smaller palette, free',
    h1: 'Compress PNG images',
    description:
      'Shrink PNG screenshots, logos and graphics losslessly with OxiPNG, or up to 80% with smart colour reduction. Transparency is kept. Private and free.',
    lead: 'Lighter PNGs for websites, docs and apps, with transparency intact.',
    tool: 'compressor',
    focus: 'image',
    parent: 'compress-image',
    guideTitle: 'Lossless vs. palette PNG',
    guide: [
      'PNG is a lossless format, so by default the tool re-packs your image more efficiently with OxiPNG without changing a single pixel. This alone often saves 10–40% on screenshots and exported graphics.',
      'For much bigger savings, turn on "fewer colours" under More options. It reduces the image to a palette of up to 256 carefully chosen colours with subtle dithering, the same trick used by popular PNG tools. For logos, icons, diagrams and most screenshots the difference is invisible, and files often shrink by 60–80%. Transparent areas stay transparent.',
      'If your PNG is actually a photo, PNG is the wrong format for it: the tool will suggest converting to WebP, which is usually dramatically smaller. Choosing a size goal automatically uses the palette method, since lossless PNG can’t trade quality for size.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Is PNG compression lossless?',
        a: 'Yes by default. The "fewer colours" option is lossy but usually invisible for graphics.',
      },
      {
        q: 'Will transparency be kept?',
        a: 'Yes, both in lossless and palette mode, and when converting to WebP or AVIF.',
      },
      {
        q: 'Why is my PNG photo still large?',
        a: 'PNG isn’t designed for photos. Convert it to JPEG or WebP to make it many times smaller.',
      },
      {
        q: 'Can I compress many screenshots at once?',
        a: 'Yes. Drop a folder of screenshots and download them all as one ZIP.',
      },
    ],
    related: ['compress-image', 'png-to-webp', 'compress-jpg'],
  },
  {
    slug: 'compress-heic',
    title: 'Compress HEIC & convert iPhone photos to JPG — private',
    h1: 'Compress HEIC photos (and convert to JPG)',
    description:
      'Convert iPhone HEIC photos to small, universal JPGs in your browser. Works on Windows and Android. Your photos are never uploaded.',
    lead: 'Turn iPhone photos into small JPGs that open on any device.',
    tool: 'compressor',
    focus: 'image',
    parent: 'compress-image',
    guideTitle: 'Working with iPhone HEIC photos',
    guide: [
      'iPhones save photos as HEIC to save space, but many websites, Windows apps and Android phones can’t open them. Drop your HEIC photos here and they’re converted to JPEG and compressed in the same step, so the result is both compatible and small.',
      'The conversion runs entirely in your browser, which matters for personal photos: they never touch a server. HEIC decoding is heavy, so photos are processed one at a time to keep your device responsive. A batch of holiday photos finishes in a minute or two.',
      'Location data is removed by default, which is good practice before posting photos online. If you’d rather keep the photos in a modern format, choose WebP or AVIF under More options.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'What is a HEIC file?',
        a: 'HEIC is the photo format iPhones use by default. It’s efficient, but not supported everywhere, which is why converting to JPG is so common.',
      },
      {
        q: 'Does converting reduce quality?',
        a: 'Very little at the Balanced setting. The result is a high-quality JPEG that’s usually smaller than the original HEIC.',
      },
      {
        q: 'Can I convert HEIC photos in bulk?',
        a: 'Yes. Drop the whole folder and download all the JPGs as one ZIP.',
      },
      {
        q: 'Will Live Photos keep their motion?',
        a: 'No. Only the still image is converted; the short video part isn’t included.',
      },
    ],
    related: ['compress-image', 'compress-jpg', 'compress-image-to-100kb'],
  },
  {
    slug: 'png-to-webp',
    title: 'Convert PNG to WebP online — free, private, batch',
    h1: 'Convert PNG to WebP',
    description:
      'Convert PNG images to WebP for faster websites, keeping transparency. Batch convert in your browser with no uploads and no limits.',
    lead: 'Much smaller images for the web, with transparency kept.',
    tool: 'compressor',
    focus: 'image',
    overrides: { imageFormat: 'webp' },
    parent: 'compress-image',
    guideTitle: 'Why convert PNG to WebP',
    guide: [
      'WebP is supported by every modern browser and is usually far smaller than PNG: photos saved as PNG often shrink by 80–90%, and graphics by 25–50%. Transparency is fully supported, so logos and cut-out product shots work exactly as before.',
      'Drop your PNGs and the output format is already set to WebP. Adjust the quality slider under More options if you want an even smaller file, or set a maximum width for images that are bigger than they’ll ever be displayed.',
      'Smaller images mean faster page loads and better Core Web Vitals scores. Keep your original PNGs as masters for editing, and publish the WebP versions.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Does WebP support transparency?',
        a: 'Yes. Transparent areas in your PNG stay transparent in the WebP.',
      },
      {
        q: 'Do all browsers support WebP?',
        a: 'Yes. All current versions of Chrome, Safari, Firefox and Edge display WebP.',
      },
      {
        q: 'Can I convert WebP back to PNG?',
        a: 'Yes. Drop the WebP file and choose PNG as the format under More options.',
      },
      {
        q: 'Is the conversion lossless?',
        a: 'It uses high-quality lossy WebP by default, which gives the biggest savings with no visible change.',
      },
    ],
    related: ['compress-png', 'jpg-to-avif', 'compress-image'],
  },
  {
    slug: 'jpg-to-avif',
    title: 'Convert JPG to AVIF online — smallest images, free',
    h1: 'Convert JPG to AVIF',
    description:
      'Convert JPG photos to AVIF, the most efficient image format, in your browser. Often half the size of JPEG at the same quality. No uploads.',
    lead: 'The smallest possible photos for modern websites.',
    tool: 'compressor',
    focus: 'image',
    overrides: { imageFormat: 'avif' },
    parent: 'compress-image',
    guideTitle: 'When AVIF makes sense',
    guide: [
      'AVIF is based on the AV1 video codec and is the most efficient image format browsers support today. At the same visual quality, an AVIF file is often around half the size of a JPEG, which makes a real difference on image-heavy websites and for visitors on mobile data.',
      'AVIF takes longer to create than JPEG or WebP, so large photos take a few seconds each. Everything runs on your own device, and big batches are spread across your processor cores.',
      'All current major browsers display AVIF. If you need to support very old browsers or email clients, keep a JPEG fallback, or use WebP, which is nearly as small and faster to create.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Is AVIF better than WebP?',
        a: 'AVIF files are usually smaller for photos. WebP encodes faster and has slightly wider support. Both are great for the web.',
      },
      {
        q: 'Can I use AVIF in emails or documents?',
        a: 'Not reliably. Many email clients and office apps don’t support it yet. Use JPEG there.',
      },
      {
        q: 'Why is AVIF conversion slower?',
        a: 'The format searches much harder for savings. That’s the price of the smallest file size.',
      },
      {
        q: 'Does AVIF support transparency?',
        a: 'Yes. AVIF supports transparent images, like PNG and WebP.',
      },
    ],
    related: ['png-to-webp', 'compress-jpg', 'compress-image'],
  },

  // ---------- Task pages ----------
  {
    slug: 'reduce-photo-size-for-job-application',
    title: 'Reduce photo size for job and exam applications — free',
    h1: 'Reduce photo size for an online application',
    description:
      'Resize and compress your photo to meet job, exam and government portal limits (20–100 KB). Private, in your browser, no signup.',
    lead: 'Meet strict photo limits on application portals in one step.',
    tool: 'compressor',
    focus: 'image',
    preset: 'u100kb',
    parent: 'compress-image',
    guideTitle: 'Meeting application photo requirements',
    guide: [
      'Recruitment, exam and government portals usually ask for a JPEG photo under a certain size, commonly between 20 KB and 100 KB, and sometimes with specific dimensions. A photo straight from a phone is often 3–5 MB, so it gets rejected.',
      'Drop your photo and the "Under 100 KB" goal is selected. If your form asks for less, pick "Under 50 KB" or "Under 20 KB", or enter the exact limit with Custom size. If specific pixel dimensions are required, enter them as the maximum width and height under More options. The tool resizes first and then finds the best quality that fits.',
      'Crop the photo so your face fills most of the frame before compressing: small limits look much better on a tight crop. Your photo stays on your device the whole time, which is important for identity documents.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'The portal needs a JPG. Will I get a JPG?',
        a: 'Yes, if your photo is a JPG. iPhone HEIC photos are converted to JPG automatically. You can also force JPEG under More options.',
      },
      {
        q: 'What if the size must be between two values, like 20–50 KB?',
        a: 'Choose "Under 50 KB". The tool aims for the best quality just under the limit, which is usually well above the minimum.',
      },
      {
        q: 'Can I also compress my signature?',
        a: 'Yes. See the signature page for the best settings for scanned signatures.',
      },
      {
        q: 'Can I compress documents like certificates too?',
        a: 'Yes. Drop PDFs or scanned images; PDFs can be reduced to 100 KB or 200 KB.',
      },
    ],
    related: [
      'reduce-signature-size',
      'compress-image-to-50kb',
      'compress-image-to-20kb',
      'compress-pdf-to-100kb',
    ],
  },
  {
    slug: 'reduce-signature-size',
    title: 'Reduce signature image size (under 20 KB) — free & private',
    h1: 'Reduce the size of a signature image',
    description:
      'Compress a scanned or photographed signature to under 20 KB for online forms, keeping it crisp. Works in your browser; nothing is uploaded.',
    lead: 'A crisp signature image under 20 KB for any online form.',
    tool: 'compressor',
    focus: 'image',
    preset: 'u20kb',
    parent: 'compress-image',
    guideTitle: 'Getting a clean, small signature',
    guide: [
      'Application forms often ask for a signature image of 10–20 KB, sometimes with dimensions like 140 × 60 pixels. Sign on plain white paper with a dark pen, take a well-lit photo or scan, and crop it tightly around the signature before compressing.',
      'Drop the image with the "Under 20 KB" goal selected. Signatures are simple, high-contrast images, so they compress extremely well and stay sharp. If the form lists exact dimensions, enter them as the maximum width and height under More options.',
      'For the crispest result with a PNG, turn on "fewer colours": a signature needs only a handful of shades, so the file becomes tiny without any blur. Because the tool runs entirely on your device, your signature is never uploaded anywhere.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Should my signature be JPG or PNG?',
        a: 'Use whatever the form asks for. If both are allowed, PNG with "fewer colours" gives the crispest lines at a tiny size.',
      },
      {
        q: 'How do I get a white background?',
        a: 'Sign on white paper in good light and crop tightly. Most phone scanner apps also clean up the background.',
      },
      {
        q: 'The portal requires at least 10 KB. Is that a problem?',
        a: 'Rarely. Results under 20 KB are usually well above 10 KB. If yours is too small, move the quality slider up under a Custom size goal.',
      },
      {
        q: 'Can I resize to exact pixels?',
        a: 'Set the maximum width and height under More options. The image keeps its proportions.',
      },
    ],
    related: ['reduce-photo-size-for-job-application', 'compress-image-to-20kb', 'compress-png'],
  },
];

export const pageBySlug = (slug: string) => SEO_PAGES.find((p) => p.slug === slug);
