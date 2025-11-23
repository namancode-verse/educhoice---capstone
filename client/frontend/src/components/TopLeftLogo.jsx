import React from 'react'
import logo from '../assets/logo.png'

export default function TopLeftLogo(){
  const style = {
    position: 'fixed',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '220px',
    height: 'auto',
    zIndex: 9999,
    display: 'block',
    pointerEvents: 'none'
  }

  return (
    <img src={logo} alt="EduChoice" style={style} />
  )
}
