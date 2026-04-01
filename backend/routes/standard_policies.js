const express = require('express')
const router = express.Router()
const { STANDARD_POLICIES } = require('../data/policies_seed')

// GET /api/policies/standard?zone_template=PLC-Zone
// Returns all standard policies for a zone template, or all policies if no filter.
router.get('/', (req, res) => {
  const { zone_template } = req.query

  if (zone_template) {
    const policies = STANDARD_POLICIES[zone_template]
    if (!policies) {
      return res.json({})
    }
    return res.json(policies)
  }

  // Return all zones
  return res.json(STANDARD_POLICIES)
})

module.exports = router
