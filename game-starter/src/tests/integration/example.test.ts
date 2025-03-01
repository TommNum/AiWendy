/**
 * Example integration test
 */

describe('Integration test example', () => {
  it('should pass a simple test', () => {
    expect(true).toBe(true);
  });
  
  it('should be able to mock external dependencies', () => {
    const mockFn = jest.fn().mockReturnValue('mocked value');
    expect(mockFn()).toBe('mocked value');
    expect(mockFn).toHaveBeenCalled();
  });
}); 