import axios from 'axios';
import { useState, useRef } from 'react';

export default function Home() {
  const authorizationRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [archivedContent, setArchivedContent] = useState('');
  const [error, setError] = useState('');
  const [downloadMessages, setDownloadMessages] = useState([]);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const fetchArchivedContent = async (event) => {
    event.preventDefault();
    setError('');
    setArchivedContent('');
    setLoading(true);
    const formData = new FormData(event.target);
    document.getElementById('result_wbm').value = 'Please wait getting data from web.archive.org.';

    const inputValues = formData.get('authorization_wbm').split('|');
    const [url, fromTimestamp, toTimestamp] = inputValues;

    try {
      const response = await fetch(`/api/download?base_url=${encodeURIComponent(url)}&from_timestamp=${fromTimestamp}&to_timestamp=${toTimestamp}`);
      const data = await response.json();

      if (response.ok) {
        setArchivedContent(data.content);
        setDownloadMessages(data.downloadMessages); 
      } else {
        setError(data.error || 'Failed to fetch archived content');
      }

      handleResponseData(data);
    } catch (err) {
      setError('Failed to fetch archived content');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseData = async (data) => {
    const resOutput = data.downloadMessages;

    if (!resOutput || resOutput.length === 0) {
      document.getElementById('result_wbm').value = 'Something went wrong. Please try again later';
    } else {
      setLoading(false);
      document.getElementById('result_wbm').value = await resOutput.join('\n');
    }
  };

  return (
    <>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="card-header bg-dark ">
          <p style={{ color: "orange", fontWeight: "600" }}>ARCHIVE - WAYBACK MACHINE</p>
        </div>
        <div className="card-body bg-dark-dim" style={{ background: "#141414" }}>
          <div className="table-responsive">
            <form method="POST" onSubmit={fetchArchivedContent}>
              <div className="row" style={{ display: 'flex' }}>
                <textarea
                  id="authorization_wbm"
                  name="authorization_wbm"
                  cols="25"
                  className="form-control text-dark"
                  rows="1"
                  placeholder="http://domain.com|from_timestamp|to_timestamp"
                  style={{ width: '100%' }}
                ></textarea>

              </div>
              <br />

              {showModal && (
                <div id="myModal" className="modal">
                  <div className="modal-content">
                    <span className="close" onClick={closeModal}>
                      &times;
                    </span>
                    <p style={{ color: "green", fontWeight: "800" }}>CONFIRM YOUR CLOUDFLARE ACCOUNT IS VERIFIED</p>
                    <p style={{ color: "black", fontWeight: "800" }}>
                      HOW TO GET ZONE-ID - <a href="https://prnt.sc/BU894__hAl5t" target="_blank">CLICK HERE</a>
                    </p>
                    <p style={{ color: "black", fontWeight: "800" }}>
                      HOW TO GET API TOKEN <br />
                      [<a href="https://prnt.sc/lsJeI75LVujF" target="_blank"> STEP 1 </a>]
                      [<a href="https://prnt.sc/_bl7aVu4nzV8" target="_blank"> STEP 2 </a>]
                      [<a href="https://prnt.sc/j2OiQ5rc5f7k" target="_blank"> STEP 3 </a>]
                      [<a href="https://prnt.sc/HI1o8bKPrfDo" target="_blank"> STEP 4 </a>]
                      [<a href="https://prnt.sc/EvL3N65jechu" target="_blank"> STEP 5 </a>]
                    </p>
                  </div>
                </div>
              )}

              <style jsx>{`
                .modal {
                  display: ${showModal ? 'block' : 'none'};
                  position: fixed;
                  z-index: 1;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  overflow: auto;
                  background-color: rgba(0, 0, 0, 0.4);
                }

                .modal-content {
                  background-color: #fefefe;
                  margin: 15% auto;
                  padding: 20px;
                  border: 1px solid #888;
                  width: 80%;
                }

                .close {
                  color: #aaa;
                  float: right;
                  font-size: 28px;
                  font-weight: bold;
                  cursor: pointer;
                }

                .close:hover,
                .close:focus {
                  color: black;
                  text-decoration: none;
                  cursor: pointer;
                }
              `}</style>
              <center>
                {loading && (
                  <>
                    <div className="loader" style={{ display: "block !important", color: "#000" }}></div><br />
                  </>
                )}
                <input
                  className="btn btn-secondary"
                  value="GET SAMPLE"
                />
                <input
                  type="submit"
                  style={{ background: 'orange', color: 'white', marginLeft: "2px" }}
                  className="btn"
                  value="START"
                />
                <input
                  style={{ marginLeft: "2px" }}
                  className="btn btn-secondary"
                  value="HOW TO USE"
                  onClick={openModal}
                />
                <br />
                <br />
              </center>
            </form>
          </div>
        </div>

        <div className="card-body bg-dark-dim" style={{ background: "#141414" }}>
          <div className="table-responsive">
            <textarea
              id="result_wbm"
              name="result_wbm"
              cols="25"
              className="form-control text-dark"
              rows="1"
              placeholder="result goes here"
              disabled
              style={{ width: '100%', height: '300px' }}
            ></textarea>
          </div>
        </div>
      </div>
    </>
  );
}
