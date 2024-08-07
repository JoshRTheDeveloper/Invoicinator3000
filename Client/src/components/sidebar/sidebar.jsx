import React, { useEffect, useState } from 'react';
import './sidebar.css';
import { Link } from 'react-router-dom';
import Auth from '../../utils/auth';
import { getUserData, getProfilePicture } from '../../utils/indexedDB';
import { GET_USER } from '../../utils/queries';
import { useQuery } from '@apollo/client';

const Sidebar = () => {
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');

  const profile = Auth.getProfile();
  const userId = profile?.data?._id || '';

  const { data: userDataFromDB, error: errorFromDB, refetch } = useQuery(GET_USER, {
    variables: { userId },
    skip: !userId,
  });

  const fetchUserDataFromIndexedDB = async () => {
    const userData = await getUserData(userId);
    const profilePicBlob = await getProfilePicture(userId); 

    if (userData) {
      setUserFirstName(userData.firstName);
      setUserLastName(userData.lastName);
      if (profilePicBlob) {
        const profilePicUrl = URL.createObjectURL(profilePicBlob);
        setProfilePicture(profilePicUrl); 
     
      } else {
        setProfilePicture(''); 
      }
    }

  };


  useEffect(() => {
    if (userId) {
      refetch();
    }
  }, [userId]);

  useEffect(() => {
    const fetchProfilePicture = () => {
      if (userDataFromDB && userDataFromDB.getUser) {
        const profilePictureUrl = userDataFromDB.getUser.profilePicture;
        setProfilePictureUrl(profilePictureUrl);
      } else {
        fetchUserDataFromIndexedDB();
      }
    };

    fetchProfilePicture();
  }, [userDataFromDB]);

  useEffect(() => {
    if (userDataFromDB && userDataFromDB.getUser) {
      const { firstName, lastName, profilePicture } = userDataFromDB.getUser;
      setUserFirstName(firstName);
      setUserLastName(lastName);
      setProfilePictureUrl(profilePicture);
      fetchUserDataFromIndexedDB();
    } else if (userId) {
      fetchUserDataFromIndexedDB();
    }
  }, [userDataFromDB, userId]);


  return (
    <div className='content'>
      <div className='sidebar'>
        <div className='profile-picture-div'>
          {profilePictureUrl ? (
            <img src={navigator.onLine ? profilePictureUrl : profilePicture} className='profile-picture2' alt='Profile' />
          ) : (
            <span>Loading profile picture...</span>
          )}
        </div>
   
        <ul>
          <li>
            <Link to='/dashboard'>Dashboard</Link>
          </li>
          <li>
            <Link to='/CreateInvoices'>Create Invoice</Link>
          </li>
          <li>
            <Link to='/Profile'>Profile</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
