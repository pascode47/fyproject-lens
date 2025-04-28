const { Programme } = require('../models');
const { response } = require('../utils');

/**
 * Get all programmes
 * @route GET /api/programmes
 * @access Public
 */
exports.getProgrammes = async (req, res, next) => {
  console.log('Attempting to get programmes...'); // Log entry
  try {
    const programmes = await Programme.find().sort('abbreviation');
    console.log(`Found ${programmes.length} programmes.`); // Log result count
    
    console.log('Sending success response for getProgrammes...'); // Log before response
    return response.success(
      res,
      'Programmes retrieved successfully',
      { programmes }
    );
  } catch (error) {
    console.error('Error in getProgrammes:', error); // Log any caught errors
    next(error);
  }
};

/**
 * Get a single programme
 * @route GET /api/programmes/:id
 * @access Public
 */
exports.getProgramme = async (req, res, next) => {
  try {
    const programme = await Programme.findById(req.params.id);
    
    if (!programme) {
      return response.error(res, 'Programme not found', 404);
    }
    
    return response.success(
      res,
      'Programme retrieved successfully',
      { programme }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new programme
 * @route POST /api/programmes
 * @access Private (Admin only)
 */
exports.createProgramme = async (req, res, next) => {
  try {
    const { abbreviation, fullName, discipline } = req.body;
    
    // Check if programme already exists
    const existingProgramme = await Programme.findOne({ 
      $or: [
        { abbreviation },
        { fullName }
      ]
    });
    
    if (existingProgramme) {
      return response.error(res, 'Programme already exists', 400);
    }
    
    // Create programme
    const programme = await Programme.create({
      abbreviation,
      fullName,
      discipline
    });
    
    return response.success(
      res,
      'Programme created successfully',
      { programme },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update a programme
 * @route PUT /api/programmes/:id
 * @access Private (Admin only)
 */
exports.updateProgramme = async (req, res, next) => {
  try {
    const { abbreviation, fullName, discipline } = req.body;
    
    // Check if programme exists
    let programme = await Programme.findById(req.params.id);
    
    if (!programme) {
      return response.error(res, 'Programme not found', 404);
    }
    
    // Check if updated values conflict with existing programmes
    if (abbreviation && abbreviation !== programme.abbreviation) {
      const existingAbbr = await Programme.findOne({ abbreviation });
      if (existingAbbr) {
        return response.error(res, 'Abbreviation already in use', 400);
      }
    }
    
    if (fullName && fullName !== programme.fullName) {
      const existingName = await Programme.findOne({ fullName });
      if (existingName) {
        return response.error(res, 'Full name already in use', 400);
      }
    }
    
    // Update programme
    programme = await Programme.findByIdAndUpdate(
      req.params.id,
      { abbreviation, fullName, discipline },
      { new: true, runValidators: true }
    );
    
    return response.success(
      res,
      'Programme updated successfully',
      { programme }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a programme
 * @route DELETE /api/programmes/:id
 * @access Private (Admin only)
 */
exports.deleteProgramme = async (req, res, next) => {
  try {
    const programme = await Programme.findById(req.params.id);
    
    if (!programme) {
      return response.error(res, 'Programme not found', 404);
    }
    
    await programme.deleteOne();
    
    return response.success(
      res,
      'Programme deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};
