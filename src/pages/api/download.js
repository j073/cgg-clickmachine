import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const WaybackMachineDownloader = {
  base_url: '',
  directory: '',
  all_timestamps: false,
  from_timestamp: 0,
  to_timestamp: 0,
  only_filter: '',
  exclude_filter: '',
  all: false,
  maximum_pages: 100,
  threads_count: 1,
  downloadMessages: [], 

  backupName() {
    if (this.base_url && this.base_url.includes('//')) {
      return this.base_url.split('/')[2];
    } else {
      return this.base_url;
    }
  },

  backupPath() {
    if (this.directory) {
      return path.join(this.directory, '/');
    } else {
      return path.join('websites', this.backupName(), '/');
    }
  },

  async getRawListFromAPI(url, pageIndex) {
    const baseUrl = 'https://web.archive.org/cdx/search/xd';
    const params = new URLSearchParams({
      output: 'json',
      url,
      fl: 'timestamp,original',
      collapse: 'digest',
      gzip: 'false',
    });

    if (!this.all) {
      params.append('filter', 'statuscode:200');
    }
    if (this.from_timestamp && this.from_timestamp !== 0) {
      params.append('from', this.from_timestamp.toString());
    }
    if (this.to_timestamp && this.to_timestamp !== 0) {
      params.append('to', this.to_timestamp.toString());
    }
    if (pageIndex) {
      params.append('page', pageIndex);
    }

    const requestUrl = `${baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(requestUrl);
      const data = await response.json();

      if (data.length > 0 && data[0][0] === 'timestamp' && data[0][1] === 'original') {
        data.shift();
      }

      return data;
    } catch (error) {
      console.error('Error fetching Wayback Machine data:', error);
      return [];
    }
  },

  async getAllSnapshotsToConsider() {
    try {
      let snapshotListToConsider = [];
      snapshotListToConsider = snapshotListToConsider.concat(await this.getRawListFromAPI(this.base_url, null));

      if (!this.exact_url) {
        for (let page_index = 0; page_index < this.maximum_pages; page_index++) {
          const snapshotList = await this.getRawListFromAPI(this.base_url + '/*', page_index);
          if (snapshotList.length === 0) break;
          snapshotListToConsider = snapshotListToConsider.concat(snapshotList);
        }
      }

      console.log(`Found ${snapshotListToConsider.length} snapshots to consider.`);
      return snapshotListToConsider;
    } catch (error) {
      console.error('Error getting snapshots to consider:', error);
      throw error;
    }
  },

  async getCuratedFileList() {
    try {
      const file_list_curated = {};
      const snapshotList = await this.getAllSnapshotsToConsider();

      snapshotList.forEach(([file_timestamp, file_url]) => {
        if (!file_url || !file_url.includes('/')) return;
        let file_id = file_url.split('/').slice(3).join('/');
        file_id = decodeURIComponent(file_id);

        if (!this.matchExcludeFilter(file_url) && this.matchOnlyFilter(file_url)) {
          if (!file_list_curated[file_id] || file_list_curated[file_id].timestamp <= file_timestamp) {
            file_list_curated[file_id] = { file_url, timestamp: file_timestamp };
          }
        }
      });

      return file_list_curated;
    } catch (error) {
      console.error('Error getting curated file list:', error);
      throw error;
    }
  },

  async downloadFiles() {
    try {
      console.log(`Downloading ${this.base_url} to ${this.backupPath()} from Wayback Machine archives.`);
      this.downloadMessages = []; 

      const fileList = await this.getCuratedFileList();
      const start_time = new Date();
      const threads = Array.from({ length: this.threads_count }, () => this.downloadThread(fileList));
      await Promise.all(threads);

      const end_time = new Date();
      console.log(`Download completed in ${(end_time - start_time) / 1000}s, saved in ${this.backupPath()} (${Object.keys(fileList).length} files)`);
    } catch (error) {
      console.error('Error downloading files:', error);
      throw error;
    }
  },

  async downloadThread(fileList) {
    try {
      while (true) {
        const file_remote_info = this.getNextFile(fileList);
        if (!file_remote_info) break;
        const downloadMessage = await this.downloadFile(file_remote_info);
        this.downloadMessages.push(downloadMessage);
      }
    } catch (error) {
      console.error('Error in download thread:', error);
      throw error;
    }
  },

  getNextFile(fileList) {
    const file_ids = Object.keys(fileList);
    if (file_ids.length === 0) return null;

    const file_id = file_ids.pop();
    const file_remote_info = fileList[file_id];
    delete fileList[file_id];
    return file_remote_info;
  },

  async downloadFile(file_remote_info) {
    try {
      const { file_url, timestamp } = file_remote_info;
      const file_path_elements = file_url.split('/').slice(3);
      const file_id = file_path_elements.join('/');
      const dir_path = path.join(this.backupPath(), file_path_elements.slice(0, -1).join('/'));
      const file_name = path.basename(file_url.split('?')[0]); 
      const file_path = path.join(dir_path, file_name); 

      await fs.promises.mkdir(dir_path, { recursive: true });

      const response = await fetch(`https://web.archive.org/web/${timestamp}id_/${file_url}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${file_url}: ${response.statusText}`);
      }

      const fileStream = fs.createWriteStream(file_path);
      response.body.pipe(fileStream);

      await new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });

      const downloadMessage = `Downloaded ${file_url} to ${file_path} - Response status: ${response.statusText}`; ;
      console.log(downloadMessage);
      return downloadMessage;
      
    } catch (error) {
      console.error(`Error downloading ${file_remote_info ? file_remote_info.file_url : 'file'}:`, error);
      throw error;
    }
  },

  matchOnlyFilter(file_url) {
    if (this.only_filter) {
      const only_filter_regex = new RegExp(this.only_filter, 'i');
      return only_filter_regex.test(file_url);
    }
    return true;
  },

  matchExcludeFilter(file_url) {
    if (this.exclude_filter) {
      const exclude_filter_regex = new RegExp(this.exclude_filter, 'i');
      return exclude_filter_regex.test(file_url);
    }
    return false;
  },
};

export default async (req, res) => {
  const {
    base_url,
    directory,
    all_timestamps,
    from_timestamp,
    to_timestamp,
    only_filter,
    exclude_filter,
    all,
    maximum_pages,
    threads_count,
  } = req.query;

  try {
    if (!base_url) {
      return res.status(200).json({ error: 'Missing required parameter: base_url' });
    }

    WaybackMachineDownloader.base_url = base_url;
    WaybackMachineDownloader.directory = directory;
    WaybackMachineDownloader.all_timestamps = all_timestamps === 'true';
    WaybackMachineDownloader.from_timestamp = parseInt(from_timestamp) || 0;
    WaybackMachineDownloader.to_timestamp = parseInt(to_timestamp) || 0;
    WaybackMachineDownloader.only_filter = only_filter;
    WaybackMachineDownloader.exclude_filter = exclude_filter;
    WaybackMachineDownloader.all = all === 'true';
    WaybackMachineDownloader.maximum_pages = parseInt(maximum_pages) || 100;
    WaybackMachineDownloader.threads_count = parseInt(threads_count) || 1;

    await WaybackMachineDownloader.downloadFiles();
    const resOutput = 'Files downloaded successfully';
    
    res.status(200).json({ resOutput, downloadMessages });

  } catch (error) {
    console.error('Error downloading files:', error);
    res.status(500).json({ error: 'Error downloading files' });
  }
};