import React, { Fragment } from "react"
import { useContent } from 'react-monetize'

function MonetizationOff() {
    const { isMonetized } = useContent()
    // console.log("isMonetized",isMonetized)
    // console.log("isLoading", isLoading)
    return (
        <Fragment>
        {
            !isMonetized ? 
            <div>
                You do not have monetization enabled.
                To get the full experience please 
                <a href="https://webmonetization.org/docs/getting-started.html" target="_blank" rel="noopener noreferrer">Get Started!</a>
            </div>
            : 
            <div>Monetization Enabled. Thanks for your support!</div>
        }
      </Fragment>
    )
}

export default MonetizationOff;
